import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getSessionUser } from '@/lib/auth-helpers';
import { verifyAndStoreRegistration } from '@/lib/passkey';
import { audit } from '@/lib/audit';

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return new NextResponse('Sign in first.', { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object' || !('response' in body)) {
    return new NextResponse('Bad request.', { status: 400 });
  }

  const nickname =
    'nickname' in body && typeof (body as { nickname?: unknown }).nickname === 'string'
      ? (body as { nickname: string }).nickname
      : null;

  const result = await verifyAndStoreRegistration({
    userId: user.id,
    response: (body as { response: Parameters<typeof verifyAndStoreRegistration>[0]['response'] }).response,
    nickname,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.reason }, { status: 400 });
  }

  await audit({
    actorType: 'user',
    actorId: user.id,
    actorRole: user.role,
    actionType: 'create',
    targetType: 'Authenticator',
    targetId: user.id,
    metadata: { event: 'passkey_registered', nickname },
  });

  revalidatePath('/family/account');
  revalidatePath('/companion/account');
  revalidatePath('/me');
  return NextResponse.json({ ok: true });
}
