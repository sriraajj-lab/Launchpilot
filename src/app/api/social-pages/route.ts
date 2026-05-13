import { NextRequest } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { requireAuth, unauthorizedResponse, errorResponse, successResponse } from '@/lib/auth-helpers';

const createSocialPageSchema = z.object({
  productId: z.string().min(1),
  platform: z.enum(['linkedin', 'facebook', 'instagram', 'twitter']),
});

// GET /api/social-pages
export async function GET() {
  try {
    const user = await requireAuth();
    const pages = await prisma.socialPage.findMany({
      where: { product: { userId: user.id } },
      include: { product: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return successResponse(pages);
  } catch (error: any) {
    if (error.message === 'Unauthorized') return unauthorizedResponse();
    return errorResponse(error.message, 500);
  }
}

// POST /api/social-pages - Queue a social page creation
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const data = createSocialPageSchema.parse(body);

    // Verify product belongs to user
    const product = await prisma.product.findFirst({
      where: { id: data.productId, userId: user.id },
    });
    if (!product) return errorResponse('Product not found', 404);

    // Check if page already exists
    const existing = await prisma.socialPage.findFirst({
      where: { productId: data.productId, platform: data.platform },
    });
    if (existing) return errorResponse(`${data.platform} page already exists for this product`, 409);

    // Create social page record
    const page = await prisma.socialPage.create({
      data: {
        productId: data.productId,
        platform: data.platform,
        pageName: product.name,
        status: 'pending',
      },
    });

    // Queue the creation job
    await prisma.job.create({
      data: {
        type: 'social_page_creation',
        payload: JSON.stringify({
          socialPageId: page.id,
          productId: product.id,
          platform: data.platform,
          productData: {
            name: product.name,
            tagline: product.tagline,
            description: product.description,
            url: product.url,
            category: product.category,
            logoUrl: product.logoUrl,
          },
        }),
        status: 'queued',
      },
    });

    return successResponse(page, 201);
  } catch (error: any) {
    if (error.message === 'Unauthorized') return unauthorizedResponse();
    if (error instanceof z.ZodError) return errorResponse(error.errors[0].message);
    return errorResponse(error.message, 500);
  }
}
