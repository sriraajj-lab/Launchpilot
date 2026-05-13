/**
 * Launch Pilot - Job Queue Worker
 * 
 * Background worker that processes automation jobs.
 * Run separately with: npm run worker
 * 
 * In production, this runs as a separate process/container.
 * It polls the database for queued jobs and processes them sequentially.
 */

import prisma from '../db';
import { decrypt } from '../encryption';
import { ServerAutomationEngine } from '../automation/server-engine';
import { SubmissionJobData } from './producer';

const POLL_INTERVAL = 5000; // 5 seconds
const MAX_CONCURRENT = 1; // One browser at a time

let isRunning = false;
let activeJobs = 0;

/**
 * Start the worker loop
 */
async function startWorker() {
  console.log('=== Launch Pilot Worker Started ===');
  console.log(`Poll interval: ${POLL_INTERVAL}ms`);
  console.log(`Max concurrent: ${MAX_CONCURRENT}`);
  console.log('');

  isRunning = true;

  while (isRunning) {
    try {
      if (activeJobs < MAX_CONCURRENT) {
        await processNextJob();
      }
    } catch (error) {
      console.error('[Worker] Error in poll loop:', error);
    }

    await sleep(POLL_INTERVAL);
  }
}

/**
 * Pick up and process the next queued job
 */
async function processNextJob() {
  // Find the next queued job that's ready to run
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

  if (!job) return;

  activeJobs++;
  console.log(`[Worker] Processing job ${job.id} (${job.type})`);

  // Mark as running
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
        // Campaign jobs are just orchestration markers
        await prisma.job.update({
          where: { id: job.id },
          data: { status: 'completed', completedAt: new Date() },
        });
        break;
      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }
  } catch (error: any) {
    console.error(`[Worker] Job ${job.id} failed:`, error.message);

    const retries = job.retries + 1;
    if (retries < job.maxRetries) {
      await prisma.job.update({
        where: { id: job.id },
        data: {
          status: 'queued',
          retries,
          error: error.message,
          // Exponential backoff
          scheduledAt: new Date(Date.now() + retries * 60 * 1000),
        },
      });
    } else {
      await prisma.job.update({
        where: { id: job.id },
        data: { status: 'failed', error: error.message, completedAt: new Date() },
      });
    }
  } finally {
    activeJobs--;
  }
}

/**
 * Process a single platform submission
 */
async function processSubmissionJob(job: any) {
  const data: SubmissionJobData = JSON.parse(job.payload);

  // Update submission status
  await prisma.submission.update({
    where: { id: data.submissionId },
    data: { status: 'running', attempts: { increment: 1 }, lastAttempt: new Date() },
  });

  // Decrypt credentials if present
  let credentials: { username: string; password: string } | undefined;
  if (data.credentials) {
    try {
      credentials = {
        username: data.credentials.username,
        password: decrypt(data.credentials.password),
      };
    } catch {
      // Password might not be encrypted in dev
      credentials = data.credentials;
    }
  }

  // Run the automation
  const engine = new ServerAutomationEngine();
  const result = await engine.submitToPlatform(data.platformId, data.productData, credentials);

  // Update submission with result
  await prisma.submission.update({
    where: { id: data.submissionId },
    data: {
      status: result.success ? 'success' : (result.needsCaptcha ? 'captcha_needed' : (result.needsManualAction ? 'manual_needed' : 'failed')),
      resultUrl: result.submittedUrl || null,
      error: result.error || null,
      screenshot: result.screenshotBase64 || null,
    },
  });

  // Update job
  await prisma.job.update({
    where: { id: job.id },
    data: { status: 'completed', completedAt: new Date() },
  });

  // Check if all submissions in campaign are done
  await checkCampaignCompletion(data.campaignId);

  console.log(`[Worker] Submission ${data.submissionId} -> ${data.platformId}: ${result.success ? 'SUCCESS' : 'FAILED'}`);
}

/**
 * Check if a campaign is fully complete
 */
async function checkCampaignCompletion(campaignId: string) {
  const submissions = await prisma.submission.findMany({
    where: { campaignId },
    select: { status: true },
  });

  const allDone = submissions.every(s =>
    ['success', 'failed', 'captcha_needed', 'manual_needed'].includes(s.status)
  );

  if (allDone) {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'completed', completedAt: new Date() },
    });
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Worker] Shutting down gracefully...');
  isRunning = false;
  setTimeout(() => process.exit(0), 2000);
});

process.on('SIGTERM', () => {
  isRunning = false;
  setTimeout(() => process.exit(0), 2000);
});

// Start
startWorker();
