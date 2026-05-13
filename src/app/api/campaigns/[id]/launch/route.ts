import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, unauthorizedResponse, errorResponse, successResponse } from '@/lib/auth-helpers';
import { addCampaignToQueue } from '@/lib/queue/producer';

// POST /api/campaigns/[id]/launch - Start running a campaign
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();

    const campaign = await prisma.campaign.findFirst({
      where: { id: params.id, userId: user.id },
      include: { product: true, submissions: true },
    });

    if (!campaign) return errorResponse('Campaign not found', 404);

    if (campaign.status === 'running') {
      return errorResponse('Campaign is already running', 400);
    }

    if (campaign.status === 'completed') {
      return errorResponse('Campaign is already completed. Create a new one to re-run.', 400);
    }

    // Update campaign status
    await prisma.campaign.update({
      where: { id: params.id },
      data: {
        status: 'queued',
        startedAt: new Date(),
      },
    });

    // Update all pending submissions to queued
    await prisma.submission.updateMany({
      where: { campaignId: params.id, status: 'pending' },
      data: { status: 'queued' },
    });

    // Add to job queue
    await addCampaignToQueue(campaign.id, user.id);

    return successResponse({ 
      success: true, 
      message: 'Campaign launched! Submissions will begin processing.',
      campaignId: campaign.id,
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') return unauthorizedResponse();
    return errorResponse(error.message, 500);
  }
}
