import { NextRequest } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { requireAuth, unauthorizedResponse, errorResponse, successResponse } from '@/lib/auth-helpers';
import { encrypt, decrypt } from '@/lib/encryption';

const createAccountSchema = z.object({
  platform: z.string().min(1),
  username: z.string().min(1),
  password: z.string().min(1),
  notes: z.string().optional(),
});

// GET /api/accounts - List all platform accounts (passwords masked)
export async function GET() {
  try {
    const user = await requireAuth();
    const accounts = await prisma.platformAccount.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        platform: true,
        username: true,
        isActive: true,
        lastUsed: true,
        notes: true,
        createdAt: true,
      },
      orderBy: { platform: 'asc' },
    });
    return successResponse(accounts);
  } catch (error: any) {
    if (error.message === 'Unauthorized') return unauthorizedResponse();
    return errorResponse(error.message, 500);
  }
}

// POST /api/accounts - Add a new platform account
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const data = createAccountSchema.parse(body);

    // Encrypt password before storing
    const encryptedPassword = encrypt(data.password);

    const account = await prisma.platformAccount.create({
      data: {
        userId: user.id,
        platform: data.platform,
        username: data.username,
        password: encryptedPassword,
        notes: data.notes || null,
      },
      select: {
        id: true,
        platform: true,
        username: true,
        isActive: true,
        createdAt: true,
      },
    });

    return successResponse(account, 201);
  } catch (error: any) {
    if (error.message === 'Unauthorized') return unauthorizedResponse();
    if (error instanceof z.ZodError) return errorResponse(error.errors[0].message);
    if (error.code === 'P2002') return errorResponse('Account already exists for this platform and username');
    return errorResponse(error.message, 500);
  }
}
