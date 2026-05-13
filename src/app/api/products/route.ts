import { NextRequest } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { requireAuth, unauthorizedResponse, errorResponse, successResponse } from '@/lib/auth-helpers';

const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  tagline: z.string().min(1, 'Tagline is required').max(60),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  url: z.string().url('Must be a valid URL'),
  logoUrl: z.string().url().optional().nullable(),
  screenshotUrls: z.array(z.string().url()).optional(),
  category: z.string().min(1, 'Category is required'),
  targetAudience: z.string().optional(),
  keywords: z.string().min(1, 'At least one keyword is required'),
  pricing: z.enum(['free', 'freemium', 'paid', 'open-source']).optional(),
});

// GET /api/products - List all products for current user
export async function GET() {
  try {
    const user = await requireAuth();
    const products = await prisma.product.findMany({
      where: { userId: user.id },
      include: {
        campaigns: { select: { id: true, status: true } },
        socialPages: { select: { id: true, platform: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return successResponse(products);
  } catch (error: any) {
    if (error.message === 'Unauthorized') return unauthorizedResponse();
    return errorResponse(error.message, 500);
  }
}

// POST /api/products - Create a new product
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const data = createProductSchema.parse(body);

    const product = await prisma.product.create({
      data: {
        userId: user.id,
        name: data.name,
        tagline: data.tagline,
        description: data.description,
        url: data.url,
        logoUrl: data.logoUrl || null,
        screenshotUrls: data.screenshotUrls ? JSON.stringify(data.screenshotUrls) : null,
        category: data.category,
        targetAudience: data.targetAudience || null,
        keywords: data.keywords,
        pricing: data.pricing || null,
      },
    });

    return successResponse(product, 201);
  } catch (error: any) {
    if (error.message === 'Unauthorized') return unauthorizedResponse();
    if (error instanceof z.ZodError) return errorResponse(error.errors[0].message);
    return errorResponse(error.message, 500);
  }
}
