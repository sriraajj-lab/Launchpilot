import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, unauthorizedResponse, errorResponse, successResponse } from '@/lib/auth-helpers';

/**
 * GET /api/launch/[id]
 * 
 * Get real-time status of a launch campaign.
 * Polled by the frontend every few seconds.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();

    const campaign = await prisma.campaign.findFirst({
      where: { id: params.id, userId: user.id },
      include: {
        submissions: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            platform: true,
            platformName: true,
            status: true,
            resultUrl: true,
            error: true,
            updatedAt: true,
          },
        },
        product: {
          select: { name: true, url: true },
        },
      },
    });

    if (!campaign) return errorResponse('Campaign not found', 404);

    return successResponse({
      campaignId: campaign.id,
      status: campaign.status,
      name: campaign.product.name,
      url: campaign.product.url,
      startedAt: campaign.startedAt,
      completedAt: campaign.completedAt,
      submissions: campaign.submissions,
    });

  } catch (error: any) {
    if (error.message === 'Unauthorized') return unauthorizedResponse();
    return errorResponse(error.message, 500);
  }
}
