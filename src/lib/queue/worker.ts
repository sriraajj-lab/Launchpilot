/**
 * Launch Pilot - Job Queue Worker (v2 - Interactive)
 *
 * Background worker that processes automation jobs.
 * When CAPTCHA/login is detected, the engine pauses and waits
 * for the user to complete the action via the embedded VNC browser.
 *
 * Features:
 * - Polls DB for queued jobs
 * - Passes submissionId to engine for pause/resume signaling
 * - Retries with exponential backoff
 * - Heartbeat file for Docker health checks
 * - Graceful shutdown on SIGINT/SIGTERM
 * - Stale job recovery
 */

import { PrismaClient } from '@prisma/client';
import { ServerAutomationEngine } from '../automation/server-engine';
import fs from 'fs';

const prisma = new PrismaClient();

interface SubmissionJobData {
  submissionId: string;
  campaignId: string;
  platformId: string;
  productData: {
    name: string;
    tagline: string;
    description: string;
    url: string;
    category: string;
    keywords: string;
    pricing: string | null;
    logoUrl: string | null;
  };
  credentials?: {
    username: string;
    password: string;
  };
}

// === CONFIG ===
const POLL_INTERVAL = 5000;
const MAX_CONCURRENT = 1;
const STALE_JOB_TIMEOUT_MIN = 15; // Increased from 10 because user actions may take time
const HEARTBEAT_FILE = '/tmp/worker-heartbeat';
const DELAY_BETWEEN_JOBS_MS = 3000;

let isRunning = false;
let activeJobs = 0;
let processedCount = 0;
let errorCount = 0;

// === MAIN ===

async function startWorker() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║    LAUNCH PILOT WORKER - INTERACTIVE    ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`[Config] Poll interval: ${POLL_INTERVAL}ms`);
  console.log(`[Config] Max concurrent: ${MAX_CONCURRENT}`);
  console.log(`[Config] Headless: ${process.env.HEADLESS || 'true'}`);
  console.log(`[Config] VNC: ${process.env.VNC_ENABLED === 'true' ? 'ENABLED' : 'DISABLED'}`);
  console.log(`[Config] 2Captcha: ${process.env.TWO_CAPTCHA_API_KEY ? 'ENABLED' : 'DISABLED'}`);
  console.log(`[Config] Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('');

  // Test database connection
  try {
    await prisma.$connect();
    console.log('[DB] Connected to database ✓');
  } catch (error: any) {
    console.error('[DB] FATAL: Cannot connect to database:', error.message);
    process.exit(1);
  }

  // Recover stale jobs from previous crashes
  await recoverStaleJobs();

  isRunning = true;

  while (isRunning) {
    try {
      writeHeartbeat();

      if (activeJobs < MAX_CONCURRENT) {
        const processed = await processNextJob();
        if (processed) {
          await sleep(DELAY_BETWEEN_JOBS_MS);
        }
      }
    } catch (error: any) {
      errorCount++;
      console.error('[Worker] Error in poll loop:', error.message);
      await sleep(10000);
    }

    await sleep(POLL_INTERVAL);
  }

  await prisma.$disconnect();
  console.log('[Worker] Shut down complete.');
}

async function recoverStaleJobs() {
  const staleThreshold = new Date(Date.now() - STALE_JOB_TIMEOUT_MIN * 60 * 1000);

  const staleJobs = await prisma.job.updateMany({
    where: {
      status: 'running',
      startedAt: { lt: staleThreshold },
    },
    data: {
      status: 'queued',
      error: 'Recovered from stale state (worker crash)',
    },
  });

  if (staleJobs.count > 0) {
    console.log(`[Recovery] Re-queued ${staleJobs.count} stale jobs`);
  }

  // Reset submissions that were waiting for user action (they'll be re-processed)
  const staleActionSubmissions = await prisma.submission.updateMany({
    where: {
      status: { in: ['captcha_needed', 'manual_needed'] },
      lastAttempt: { lt: staleThreshold },
    },
    data: {
      status: 'pending',
      userSignal: null,
    },
  });

  if (staleActionSubmissions.count > 0) {
    console.log(`[Recovery] Reset ${staleActionSubmissions.count} stale action-required submissions`);
  }

  // Also recover submissions stuck in 'running'
  const staleSubmissions = await prisma.submission.updateMany({
    where: {
      status: 'running',
      lastAttempt: { lt: staleThreshold },
    },
    data: {
      status: 'pending',
    },
  });

  if (staleSubmissions.count > 0) {
    console.log(`[Recovery] Reset ${staleSubmissions.count} stale running submissions`);
  }
}

async function processNextJob(): Promise<boolean> {
  const job = await prisma.job.findFirst({
    where: {
      status: 'queued',
      OR: [
        { scheduledAt: null },
        { scheduledAt: { lte: new Date() } },
      ],
    },
    orderBy: [
      { priority: 'asc' },
      { createdAt: 'asc' },
    ],
  });

  if (!job) return false;

  activeJobs++;
  const startTime = Date.now();
  console.log(`\n[Job ${job.id.slice(-6)}] Starting: ${job.type} (attempt ${job.retries + 1}/${job.maxRetries})`);

  await prisma.job.update({
    where: { id: job.id },
    data: { status: 'running', startedAt: new Date() },
  });

  try {
    switch (job.type) {
      case 'submission':
        await processSubmissionJob(job);
        break;
      case 'campaign_run':
        await prisma.job.update({
          where: { id: job.id },
          data: { status: 'completed', completedAt: new Date() },
        });
        break;
      case 'social_page_creation':
        await prisma.job.update({
          where: { id: job.id },
          data: { status: 'completed', completedAt: new Date() },
        });
        break;
      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }

    processedCount++;
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Job ${job.id.slice(-6)}] Completed in ${elapsed}s (total processed: ${processedCount})`);
  } catch (error: any) {
    errorCount++;
    console.error(`[Job ${job.id.slice(-6)}] FAILED: ${error.message}`);

    const retries = job.retries + 1;
    if (retries < job.maxRetries) {
      const backoffMs = Math.min(retries * 60 * 1000 * Math.pow(2, retries - 1), 30 * 60 * 1000);
      console.log(`[Job ${job.id.slice(-6)}] Retry ${retries}/${job.maxRetries} in ${Math.round(backoffMs / 1000)}s`);

      await prisma.job.update({
        where: { id: job.id },
        data: {
          status: 'queued',
          retries,
          error: error.message,
          scheduledAt: new Date(Date.now() + backoffMs),
        },
      });
    } else {
      console.log(`[Job ${job.id.slice(-6)}] Max retries reached. Marking as failed.`);
      await prisma.job.update({
        where: { id: job.id },
        data: { status: 'failed', error: error.message, completedAt: new Date() },
      });

      if (job.submissionId) {
        await prisma.submission.update({
          where: { id: job.submissionId },
          data: { status: 'failed', error: error.message },
        }).catch(() => {});
      }
    }
  } finally {
    activeJobs--;
  }

  return true;
}

async function processSubmissionJob(job: any) {
  const data: SubmissionJobData = JSON.parse(job.payload);

  // Update submission status to running
  await prisma.submission.update({
    where: { id: data.submissionId },
    data: { status: 'running', attempts: { increment: 1 }, lastAttempt: new Date(), userSignal: null },
  });

  console.log(`[Submit] ${data.platformId} -> ${data.productData.name} (${data.productData.url})`);

  // Decrypt credentials if present
  let credentials: { username: string; password: string } | undefined;
  if (data.credentials) {
    try {
      const { decrypt } = await import('../encryption');
      credentials = {
        username: data.credentials.username,
        password: decrypt(data.credentials.password),
      };
    } catch {
      credentials = data.credentials;
    }
  }

  // Run the browser automation - pass submissionId for pause/resume
  const engine = new ServerAutomationEngine();
  const result = await engine.submitToPlatform(
    data.platformId,
    data.productData,
    credentials,
    data.submissionId  // This enables the pause/resume mechanism
  );

  // Determine final status
  let finalStatus: string;
  if (result.success) {
    finalStatus = 'success';
  } else if (result.needsCaptcha) {
    finalStatus = 'captcha_needed';
  } else if (result.needsManualAction) {
    finalStatus = 'manual_needed';
  } else {
    finalStatus = 'failed';
  }

  // Update submission with result
  await prisma.submission.update({
    where: { id: data.submissionId },
    data: {
      status: finalStatus,
      resultUrl: result.submittedUrl || null,
      actionUrl: result.actionUrl || null,
      actionType: result.actionType || null,
      error: result.error || result.manualActionDescription || null,
      screenshot: result.screenshotBase64 ? result.screenshotBase64.substring(0, 5000) : null,
    },
  });

  // Update job status
  await prisma.job.update({
    where: { id: job.id },
    data: { status: 'completed', completedAt: new Date() },
  });

  // Check if all submissions in campaign are done
  await checkCampaignCompletion(data.campaignId);

  const statusEmoji = finalStatus === 'success' ? '✓' : finalStatus === 'captcha_needed' ? '🔐' : finalStatus === 'manual_needed' ? '👆' : '✗';
  console.log(`[Submit] ${statusEmoji} ${data.platformId}: ${finalStatus}${result.submittedUrl ? ` (${result.submittedUrl})` : ''}${result.actionUrl ? ` | Action URL: ${result.actionUrl}` : ''}${result.actionType ? ` | Action: ${result.actionType}` : ''}`);
}

async function checkCampaignCompletion(campaignId: string) {
  const submissions = await prisma.submission.findMany({
    where: { campaignId },
    select: { status: true },
  });

  const allDone = submissions.every(s =>
    ['success', 'failed', 'captcha_needed', 'manual_needed'].includes(s.status)
  );

  if (allDone) {
    const successCount = submissions.filter(s => s.status === 'success').length;
    const total = submissions.length;

    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'completed', completedAt: new Date() },
    });

    console.log(`\n[Campaign] COMPLETED! ${successCount}/${total} successful submissions.`);
  }
}

function writeHeartbeat() {
  try {
    fs.writeFileSync(HEARTBEAT_FILE, JSON.stringify({
      timestamp: new Date().toISOString(),
      processedCount,
      errorCount,
      activeJobs,
      isRunning,
    }));
  } catch {}
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// === GRACEFUL SHUTDOWN ===

process.on('SIGINT', () => {
  console.log('\n[Worker] Received SIGINT. Shutting down gracefully...');
  isRunning = false;
  setTimeout(() => process.exit(0), 5000);
});

process.on('SIGTERM', () => {
  console.log('[Worker] Received SIGTERM. Shutting down gracefully...');
  isRunning = false;
  setTimeout(() => process.exit(0), 5000);
});

process.on('uncaughtException', (error) => {
  console.error('[Worker] Uncaught exception:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Worker] Unhandled rejection:', reason);
});

// === START ===
startWorker();
