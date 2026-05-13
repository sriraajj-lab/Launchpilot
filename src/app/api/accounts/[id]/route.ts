import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, unauthorizedResponse, errorResponse, successResponse } from '@/lib/auth-helpers';
import { encrypt } from '@/lib/encryption';

// PUT /api/accounts/[id] - Update account
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    const body = await req.json();

    const existing = await prisma.platformAccount.findFirst({
      where: { id: params.id, userId: user.id },
    });
    if (!existing) return errorResponse('Account not found', 404);

    const updateData: any = {};
    if (body.username) updateData.username = body.username;
    if (body.password) updateData.password = encrypt(body.password);
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    const account = await prisma.platformAccount.update({
      where: { id: params.id },
      data: updateData,
      select: { id: true, platform: true, username: true, isActive: true, updatedAt: true },
    });

    return successResponse(account);
  } catch (error: any) {
    if (error.message === 'Unauthorized') return unauthorizedResponse();
    return errorResponse(error.message, 500);
  }
}

// DELETE /api/accounts/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    const existing = await prisma.platformAccount.findFirst({
      where: { id: params.id, userId: user.id },
    });
    if (!existing) return errorResponse('Account not found', 404);

    await prisma.platformAccount.delete({ where: { id: params.id } });
    return successResponse({ success: true });
  } catch (error: any) {
    if (error.message === 'Unauthorized') return unauthorizedResponse();
    return errorResponse(error.message, 500);
  }
}
