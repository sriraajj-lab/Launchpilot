import { NextRequest } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { requireAuth, unauthorizedResponse, errorResponse, successResponse } from '@/lib/auth-helpers';

const createCampaignSchema = z.object({
  productId: z.string().min(1),
  name: z.string().min(1, 'Campaign name is required'),
  targetPlatforms: z.array(z.string()).min(1, 'Select at least one platform'),
  targetSubreddits: z.array(z.string()).optional(),
  createSocialPages: z.boolean().optional(),
  delayMinutes: z.number().min(1).max(60).optional(),
  scheduledAt: z.string().datetime().optional(),
});

// GET /api/campaigns
export async function GET() {
  try {
    const user = await requireAuth();
    const campaigns = await prisma.campaign.findMany({
      where: { userId: user.id },
      include: {
        product: { select: { id: true, name: true, url: true } },
        submissions: {
          select: { id: true, platform: true, platformName: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Add computed stats
    const withStats = campaigns.map(campaign => ({
      ...campaign,
      stats: {
        total: campaign.submissions.length,
        success: campaign.submissions.filter(s => s.status === 'success').length,
        failed: campaign.submissions.filter(s => s.status === 'failed').length,
        pending: campaign.submissions.filter(s => ['pending', 'queued', 'running'].includes(s.status)).length,
        manual: campaign.submissions.filter(s => ['captcha_needed', 'manual_needed'].includes(s.status)).length,
      },
    }));

    return successResponse(withStats);
  } catch (error: any) {
    if (error.message === 'Unauthorized') return unauthorizedResponse();
    return errorResponse(error.message, 500);
  }
}

// POST /api/campaigns
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const data = createCampaignSchema.parse(body);

    // Verify product belongs to user
    const product = await prisma.product.findFirst({
      where: { id: data.productId, userId: user.id },
    });
    if (!product) return errorResponse('Product not found', 404);

    // Create campaign with submissions for each platform
    const campaign = await prisma.campaign.create({
      data: {
        userId: user.id,
        productId: data.productId,
        name: data.name,
        targetPlatforms: JSON.stringify(data.targetPlatforms),
        targetSubreddits: data.targetSubreddits ? JSON.stringify(data.targetSubreddits) : null,
        createSocialPages: data.createSocialPages || false,
        delayMinutes: data.delayMinutes || 5,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        submissions: {
          create: data.targetPlatforms.map(platformId => ({
            platform: platformId,
            platformName: platformId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            status: 'pending',
          })),
        },
      },
      include: { submissions: true },
    });

    return successResponse(campaign, 201);
  } catch (error: any) {
    if (error.message === 'Unauthorized') return unauthorizedResponse();
    if (error instanceof z.ZodError) return errorResponse(error.errors[0].message);
    return errorResponse(error.message, 500);
  }
}
