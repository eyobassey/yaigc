'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { audit } from '@/lib/audit';
import { getSessionUser } from '@/lib/auth-helpers';

export async function removePasskey(formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user) return;
  const id = String(formData.get('id') ?? '');
  if (!id) return;

  // Scope: a user can only remove their own passkeys.
  const row = await prisma.authenticator.findUnique({
    where: { id },
    select: { id: true, userId: true, nickname: true },
  });
  if (!row || row.userId !== user.id) return;

  await prisma.authenticator.delete({ where: { id } });
  await audit({
    actorType: 'user',
    actorId: user.id,
    actorRole: user.role,
    actionType: 'delete',
    targetType: 'Authenticator',
    targetId: id,
    metadata: { event: 'passkey_removed', nickname: row.nickname },
  });
  revalidatePath('/family/account');
  revalidatePath('/companion/account');
  revalidatePath('/me');
}
