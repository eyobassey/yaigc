import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-helpers';
import { generateRegistrationOptions } from '@/lib/passkey';

// Start passkey registration. Auth required: the user being registered
// must already be signed in (passkey is an addition to their account,
// not a sign-up mechanism).

export async function POST() {
  const user = await getSessionUser();
  if (!user) return new NextResponse('Sign in first.', { status: 401 });

  try {
    const options = await generateRegistrationOptions(user.id);
    return NextResponse.json(options);
  } catch (err) {
    console.error('[webauthn] registration options failed', { userId: user.id, err });
    return new NextResponse('Could not start registration.', { status: 500 });
  }
}
