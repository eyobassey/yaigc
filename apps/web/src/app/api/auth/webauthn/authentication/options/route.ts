import { NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@/lib/passkey';

// Public endpoint. Returns a challenge + optional credential list. If
// the caller passes an email and that user has registered passkeys,
// the browser restricts to those credentials; otherwise the browser
// offers any discoverable passkey it has.

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { email?: unknown } | null;
  const emailHint =
    body && typeof body.email === 'string' && body.email.trim()
      ? body.email
      : undefined;

  try {
    const options = await generateAuthenticationOptions(emailHint);
    return NextResponse.json(options);
  } catch (err) {
    console.error('[webauthn] authentication options failed', { emailHint, err });
    return new NextResponse('Could not start sign-in.', { status: 500 });
  }
}
