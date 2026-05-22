'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { audit } from '@/lib/audit';
import { getSessionUser } from '@/lib/auth-helpers';

// Revoke a specific Session row. Scoped to the signed-in user; revoking
// the current session is allowed but the user will be signed out on the
// next request because their cookie no longer matches a row.

export async function revokeSession(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user) return;
  const id = String(formData.get('id') ?? '');
  if (!id) return;

  const row = await prisma.session.findUnique({
    where: { id },
    select: { id: true, userId: true },
  });
  if (!row || row.userId !== user.id) return;

  await prisma.session.delete({ where: { id } });
  await audit({
    actorType: 'user',
    actorId: user.id,
    actorRole: user.role,
    actionType: 'delete',
    targetType: 'Session',
    targetId: id,
    metadata: { event: 'session_revoked_by_user' },
  });
  revalidatePath('/family/account');
  revalidatePath('/companion/account');
  revalidatePath('/me');
}
