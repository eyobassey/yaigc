import { NextResponse } from 'next/server';
import { verifyAuthentication } from '@/lib/passkey';
import { mintAndSetSession } from '@/lib/session';
import { audit } from '@/lib/audit';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    response?: Parameters<typeof verifyAuthentication>[0];
    redirectTo?: string;
    remember?: boolean;
  } | null;
  if (!body || !body.response) {
    return new NextResponse('Bad request.', { status: 400 });
  }

  const result = await verifyAuthentication(body.response);
  if (!result.ok) {
    await audit({
      actorType: 'system',
      actorId: null,
      actionType: 'auth',
      targetType: 'User',
      targetId: null,
      metadata: { event: 'sign_in_failed', method: 'passkey', reason: result.reason },
    });
    return NextResponse.json({ ok: false, error: result.reason }, { status: 401 });
  }

  const remember = body.remember !== false;
  await mintAndSetSession({ userId: result.userId, remember });

  await audit({
    actorType: 'user',
    actorId: result.userId,
    actionType: 'auth',
    targetType: 'Session',
    targetId: result.userId,
    metadata: { event: 'sign_in', method: 'passkey', remember },
  });

  return NextResponse.json({
    ok: true,
    redirectTo: typeof body.redirectTo === 'string' ? body.redirectTo : '/me',
  });
}
