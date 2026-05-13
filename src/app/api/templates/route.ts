import { NextRequest } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { requireAuth, unauthorizedResponse, errorResponse, successResponse } from '@/lib/auth-helpers';
import { DEFAULT_TEMPLATES } from '@/lib/templates/defaults';

const createTemplateSchema = z.object({
  name: z.string().min(1),
  platform: z.string().min(1),
  type: z.enum(['post', 'dm', 'description', 'bio', 'thread', 'comment']),
  content: z.string().min(10),
});

// GET /api/templates - List all templates (user's custom + defaults)
export async function GET() {
  try {
    const user = await requireAuth();

    // Get user's custom templates
    const userTemplates = await prisma.template.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    // Combine with defaults
    const defaults = DEFAULT_TEMPLATES.map(t => ({
      id: t.id,
      name: t.name,
      platform: t.platform,
      type: t.type,
      content: t.content,
      isDefault: true,
      createdAt: null,
      updatedAt: null,
      userId: null,
    }));

    return successResponse({
      custom: userTemplates,
      defaults: defaults,
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') return unauthorizedResponse();
    return errorResponse(error.message, 500);
  }
}

// POST /api/templates - Create a custom template
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const data = createTemplateSchema.parse(body);

    const template = await prisma.template.create({
      data: {
        userId: user.id,
        name: data.name,
        platform: data.platform,
        type: data.type,
        content: data.content,
        isDefault: false,
      },
    });

    return successResponse(template, 201);
  } catch (error: any) {
    if (error.message === 'Unauthorized') return unauthorizedResponse();
    if (error instanceof z.ZodError) return errorResponse(error.errors[0].message);
    return errorResponse(error.message, 500);
  }
}
