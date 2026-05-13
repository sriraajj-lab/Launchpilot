import prisma from '@/lib/db';
import { requireAuth, unauthorizedResponse, errorResponse, successResponse } from '@/lib/auth-helpers';

// GET /api/dashboard - Get dashboard stats and recent activity
export async function GET() {
  try {
    const user = await requireAuth();

    // Get counts
    const [
      totalProducts,
      totalCampaigns,
      activeCampaigns,
      submissions,
      socialPages,
      accounts,
    ] = await Promise.all([
      prisma.product.count({ where: { userId: user.id } }),
      prisma.campaign.count({ where: { userId: user.id } }),
      prisma.campaign.count({ where: { userId: user.id, status: { in: ['running', 'queued'] } } }),
      prisma.submission.findMany({
        where: { campaign: { userId: user.id } },
        select: { status: true },
      }),
      prisma.socialPage.count({
        where: { product: { userId: user.id } },
      }),
      prisma.platformAccount.count({ where: { userId: user.id } }),
    ]);

    const stats = {
      totalProducts,
      totalCampaigns,
      activeCampaigns,
      totalSubmissions: submissions.length,
      successfulSubmissions: submissions.filter(s => s.status === 'success').length,
      failedSubmissions: submissions.filter(s => s.status === 'failed').length,
      pendingManual: submissions.filter(s => ['captcha_needed', 'manual_needed'].includes(s.status)).length,
      socialPages,
      accounts,
    };

    // Recent activity (last 20 submissions)
    const recentActivity = await prisma.submission.findMany({
      where: { campaign: { userId: user.id } },
      include: {
        campaign: { select: { product: { select: { name: true } } } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });

    return successResponse({ stats, recentActivity });
  } catch (error: any) {
    if (error.message === 'Unauthorized') return unauthorizedResponse();
    return errorResponse(error.message, 500);
  }
}
