import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, unauthorizedResponse, errorResponse, successResponse } from '@/lib/auth-helpers';
import { retrySubmission } from '@/lib/queue/producer';

// POST /api/campaigns/[id]/submissions/[submissionId]/retry
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; submissionId: string } }
) {
  try {
    const user = await requireAuth();

    // Verify the campaign belongs to the user
    const campaign = await prisma.campaign.findFirst({
      where: { id: params.id, userId: user.id },
    });
    if (!campaign) return errorResponse('Campaign not found', 404);

    // Get the submission
    const submission = await prisma.submission.findFirst({
      where: { id: params.submissionId, campaignId: params.id },
    });
    if (!submission) return errorResponse('Submission not found', 404);

    // Can only retry failed/captcha_needed/manual_needed submissions
    if (!['failed', 'captcha_needed', 'manual_needed'].includes(submission.status)) {
      return errorResponse(`Cannot retry submission with status "${submission.status}"`, 400);
    }

    await retrySubmission(submission.id, user.id);

    return successResponse({
      success: true,
      message: 'Submission queued for retry',
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') return unauthorizedResponse();
    return errorResponse(error.message, 500);
  }
}

// PATCH /api/campaigns/[id]/submissions/[submissionId] - Mark as done manually
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; submissionId: string } }
) {
  try {
    const user = await requireAuth();
    const body = await req.json();

    // Verify the campaign belongs to the user
    const campaign = await prisma.campaign.findFirst({
      where: { id: params.id, userId: user.id },
    });
    if (!campaign) return errorResponse('Campaign not found', 404);

    // Get the submission
    const submission = await prisma.submission.findFirst({
      where: { id: params.submissionId, campaignId: params.id },
    });
    if (!submission) return errorResponse('Submission not found', 404);

    const { action, resultUrl } = body;

    if (action === 'mark_done') {
      // User completed the action manually - mark as success
      await prisma.submission.update({
        where: { id: params.submissionId },
        data: {
          status: 'success',
          resultUrl: resultUrl || submission.actionUrl || null,
          error: null,
        },
      });
    } else if (action === 'mark_failed') {
      // User tried and failed - mark as failed
      await prisma.submission.update({
        where: { id: params.submissionId },
        data: {
          status: 'failed',
          error: body.error || 'User marked as failed after manual attempt',
        },
      });
    } else if (action === 'retry_after_action') {
      // User completed the action (CAPTCHA/login) and wants the worker to retry
      await prisma.submission.update({
        where: { id: params.submissionId },
        data: {
          status: 'pending',
          error: null,
          actionUrl: null,
          actionType: null,
        },
      });

      // Queue a retry job
      await retrySubmission(submission.id, user.id);
    } else {
      return errorResponse('Invalid action. Use: mark_done, mark_failed, or retry_after_action', 400);
    }

    // Check if campaign is now complete
    const allSubmissions = await prisma.submission.findMany({
      where: { campaignId: params.id },
      select: { status: true },
    });

    const allDone = allSubmissions.every(s =>
      ['success', 'failed', 'captcha_needed', 'manual_needed'].includes(s.status)
    );

    if (allDone && campaign.status === 'running') {
      await prisma.campaign.update({
        where: { id: params.id },
        data: { status: 'completed', completedAt: new Date() },
      });
    }

    return successResponse({ success: true, action });
  } catch (error: any) {
    if (error.message === 'Unauthorized') return unauthorizedResponse();
    return errorResponse(error.message, 500);
  }
}
