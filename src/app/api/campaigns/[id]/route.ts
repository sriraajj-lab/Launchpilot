import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, unauthorizedResponse, errorResponse, successResponse } from '@/lib/auth-helpers';

// GET /api/campaigns/[id]
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    const campaign = await prisma.campaign.findFirst({
      where: { id: params.id, userId: user.id },
      include: {
        product: true,
        submissions: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!campaign) return errorResponse('Campaign not found', 404);
    return successResponse(campaign);
  } catch (error: any) {
    if (error.message === 'Unauthorized') return unauthorizedResponse();
    return errorResponse(error.message, 500);
  }
}

// DELETE /api/campaigns/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    const existing = await prisma.campaign.findFirst({ where: { id: params.id, userId: user.id } });
    if (!existing) return errorResponse('Campaign not found', 404);

    await prisma.campaign.delete({ where: { id: params.id } });
    return successResponse({ success: true });
  } catch (error: any) {
    if (error.message === 'Unauthorized') return unauthorizedResponse();
    return errorResponse(error.message, 500);
  }
}
