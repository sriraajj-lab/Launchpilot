import { NextRequest } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { requireAuth, unauthorizedResponse, errorResponse, successResponse } from '@/lib/auth-helpers';

const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  tagline: z.string().min(1).max(60).optional(),
  description: z.string().min(10).optional(),
  url: z.string().url().optional(),
  logoUrl: z.string().url().optional().nullable(),
  screenshotUrls: z.array(z.string().url()).optional(),
  category: z.string().optional(),
  targetAudience: z.string().optional(),
  keywords: z.string().optional(),
  pricing: z.enum(['free', 'freemium', 'paid', 'open-source']).optional(),
});

// GET /api/products/[id]
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    const product = await prisma.product.findFirst({
      where: { id: params.id, userId: user.id },
      include: {
        campaigns: { orderBy: { createdAt: 'desc' } },
        socialPages: true,
      },
    });
    if (!product) return errorResponse('Product not found', 404);
    return successResponse(product);
  } catch (error: any) {
    if (error.message === 'Unauthorized') return unauthorizedResponse();
    return errorResponse(error.message, 500);
  }
}

// PUT /api/products/[id]
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const data = updateProductSchema.parse(body);

    const existing = await prisma.product.findFirst({ where: { id: params.id, userId: user.id } });
    if (!existing) return errorResponse('Product not found', 404);

    const product = await prisma.product.update({
      where: { id: params.id },
      data: {
        ...data,
        screenshotUrls: data.screenshotUrls ? JSON.stringify(data.screenshotUrls) : undefined,
      },
    });

    return successResponse(product);
  } catch (error: any) {
    if (error.message === 'Unauthorized') return unauthorizedResponse();
    if (error instanceof z.ZodError) return errorResponse(error.errors[0].message);
    return errorResponse(error.message, 500);
  }
}

// DELETE /api/products/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    const existing = await prisma.product.findFirst({ where: { id: params.id, userId: user.id } });
    if (!existing) return errorResponse('Product not found', 404);

    await prisma.product.delete({ where: { id: params.id } });
    return successResponse({ success: true });
  } catch (error: any) {
    if (error.message === 'Unauthorized') return unauthorizedResponse();
    return errorResponse(error.message, 500);
  }
}
