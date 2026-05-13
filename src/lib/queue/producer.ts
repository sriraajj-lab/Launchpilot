/**
 * Launch Pilot - Job Queue Producer
 * 
 * Adds automation jobs to the BullMQ queue for background processing.
 * In production, a separate worker process picks up these jobs.
 * In development (no Redis), jobs are processed inline.
 */

import prisma from '@/lib/db';

export interface CampaignJobData {
  campaignId: string;
  userId: string;
}

export interface SubmissionJobData {
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

/**
 * Add a campaign to the processing queue.
 * This creates individual submission jobs for each platform.
 */
export async function addCampaignToQueue(campaignId: string, userId: string): Promise<void> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      product: true,
      submissions: true,
    },
  });

  if (!campaign) throw new Error('Campaign not found');

  const platforms: string[] = JSON.parse(campaign.targetPlatforms);

  // Get user's platform credentials
  const accounts = await prisma.platformAccount.findMany({
    where: { userId, platform: { in: platforms }, isActive: true },
  });

  const credentialsMap = new Map(accounts.map(a => [a.platform, a]));

  // Create a job record for the campaign
  await prisma.job.create({
    data: {
      type: 'campaign_run',
      campaignId: campaign.id,
      payload: JSON.stringify({ campaignId, userId }),
      status: 'queued',
    },
  });

  // Create individual job records for each submission
  for (let i = 0; i < campaign.submissions.length; i++) {
    const submission = campaign.submissions[i];
    const creds = credentialsMap.get(submission.platform);

    await prisma.job.create({
      data: {
        type: 'submission',
        campaignId: campaign.id,
        submissionId: submission.id,
        payload: JSON.stringify({
          submissionId: submission.id,
          campaignId: campaign.id,
          platformId: submission.platform,
          productData: {
            name: campaign.product.name,
            tagline: campaign.product.tagline,
            description: campaign.product.description,
            url: campaign.product.url,
            category: campaign.product.category,
            keywords: campaign.product.keywords,
            pricing: campaign.product.pricing,
            logoUrl: campaign.product.logoUrl,
          },
          credentials: creds ? { username: creds.username, password: creds.password } : undefined,
        } satisfies SubmissionJobData),
        status: 'queued',
        priority: i, // Process in order
        scheduledAt: new Date(Date.now() + i * campaign.delayMinutes * 60 * 1000),
      },
    });
  }

  // Update campaign to running
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: 'running' },
  });
}

/**
 * Retry a failed submission
 */
export async function retrySubmission(submissionId: string, userId: string): Promise<void> {
  const submission = await prisma.submission.findFirst({
    where: { id: submissionId, campaign: { userId } },
    include: { campaign: { include: { product: true } } },
  });

  if (!submission) throw new Error('Submission not found');

  // Reset status
  await prisma.submission.update({
    where: { id: submissionId },
    data: { status: 'queued', error: null },
  });

  // Create new job
  await prisma.job.create({
    data: {
      type: 'submission',
      campaignId: submission.campaignId,
      submissionId: submission.id,
      payload: JSON.stringify({
        submissionId: submission.id,
        campaignId: submission.campaignId,
        platformId: submission.platform,
        productData: {
          name: submission.campaign.product.name,
          tagline: submission.campaign.product.tagline,
          description: submission.campaign.product.description,
          url: submission.campaign.product.url,
          category: submission.campaign.product.category,
          keywords: submission.campaign.product.keywords,
          pricing: submission.campaign.product.pricing,
          logoUrl: submission.campaign.product.logoUrl,
        },
      }),
      status: 'queued',
    },
  });
}
