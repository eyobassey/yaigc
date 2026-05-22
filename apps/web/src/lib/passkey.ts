// Passkey / WebAuthn server helpers. Built on @simplewebauthn/server.
// Mirrors the password flow: pure server functions plus API routes that
// the client calls via fetch. On successful authentication we mint a
// Session row directly (same as lib/auth-password.ts) so the existing
// database-session model keeps working.

import {
  generateRegistrationOptions as swGenerateRegistrationOptions,
  generateAuthenticationOptions as swGenerateAuthenticationOptions,
  verifyRegistrationResponse,
  verifyAuthenticationResponse,
  type AuthenticatorTransportFuture,
} from '@simplewebauthn/server';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/server';
import { prisma } from '@/lib/prisma';

// -------------------------------------------------------------------
// RP config. In production both apex and ops.* share the apex as the
// relying-party ID so a single passkey works across subdomains.
// -------------------------------------------------------------------

const IS_PROD = process.env.NODE_ENV === 'production';
export const RP_NAME = 'You Are In Good Company';
export const RP_ID = IS_PROD ? 'youareingoodcompany.co.uk' : 'localhost';
const EXPECTED_ORIGINS = IS_PROD
  ? [
      'https://youareingoodcompany.co.uk',
      'https://ops.youareingoodcompany.co.uk',
    ]
  : ['http://localhost:3000'];

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

// -------------------------------------------------------------------
// Challenge persistence. Short-lived, single-use rows in DB.
// -------------------------------------------------------------------

async function storeChallenge(input: {
  challenge: string;
  userId?: string;
  email?: string;
  purpose: 'registration' | 'authentication';
}): Promise<void> {
  await prisma.webAuthnChallenge.create({
    data: {
      challenge: input.challenge,
      userId: input.userId ?? null,
      email: input.email ?? null,
      purpose: input.purpose,
      expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
    },
  });
}

async function consumeChallenge(
  challenge: string,
  purpose: 'registration' | 'authentication',
): Promise<{ userId: string | null; email: string | null } | null> {
  const row = await prisma.webAuthnChallenge.findUnique({
    where: { challenge },
  });
  if (!row || row.purpose !== purpose) return null;
  // Always delete so it's single-use, even on expiry / mismatch.
  await prisma.webAuthnChallenge.delete({ where: { id: row.id } });
  if (row.expiresAt < new Date()) return null;
  return { userId: row.userId, email: row.email };
}

// -------------------------------------------------------------------
// Registration
// -------------------------------------------------------------------

export async function generateRegistrationOptions(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      authenticators: { select: { credentialID: true, transports: true } },
    },
  });
  if (!user) throw new Error('User not found');

  const options = await swGenerateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userName: user.email,
    userDisplayName: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
    // Exclude credentials already registered for this user so the
    // browser won't re-register the same device.
    excludeCredentials: user.authenticators.map((a) => ({
      id: a.credentialID,
      transports: (a.transports?.split(',').filter(Boolean) ?? []) as AuthenticatorTransportFuture[],
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
  });

  await storeChallenge({
    challenge: options.challenge,
    userId: user.id,
    purpose: 'registration',
  });

  return options;
}

export async function verifyAndStoreRegistration(input: {
  userId: string;
  response: RegistrationResponseJSON;
  nickname?: string | null;
}): Promise<{ ok: boolean; reason?: string }> {
  const consumed = await consumeChallenge(
    input.response.response.clientDataJSON
      ? JSON.parse(Buffer.from(input.response.response.clientDataJSON, 'base64url').toString())
          .challenge
      : '',
    'registration',
  );
  if (!consumed || consumed.userId !== input.userId) {
    return { ok: false, reason: 'Challenge expired or did not match.' };
  }

  const verification = await verifyRegistrationResponse({
    response: input.response,
    expectedChallenge: JSON.parse(
      Buffer.from(input.response.response.clientDataJSON, 'base64url').toString(),
    ).challenge,
    expectedOrigin: EXPECTED_ORIGINS,
    expectedRPID: RP_ID,
    requireUserVerification: false,
  });

  if (!verification.verified || !verification.registrationInfo) {
    return { ok: false, reason: 'Could not verify the device.' };
  }

  const { credential, credentialDeviceType, credentialBackedUp } =
    verification.registrationInfo;

  await prisma.authenticator.create({
    data: {
      userId: input.userId,
      credentialID: credential.id,
      credentialPublicKey: Buffer.from(credential.publicKey),
      counter: BigInt(credential.counter ?? 0),
      credentialDeviceType,
      credentialBackedUp,
      transports: input.response.response.transports?.join(',') ?? null,
      nickname: input.nickname?.trim() || null,
    },
  });

  return { ok: true };
}

// -------------------------------------------------------------------
// Authentication
// -------------------------------------------------------------------

export async function generateAuthenticationOptions(emailHint?: string) {
  let allow: { id: string; transports?: AuthenticatorTransportFuture[] }[] = [];
  let userId: string | null = null;
  if (emailHint) {
    const user = await prisma.user.findUnique({
      where: { email: emailHint.toLowerCase().trim() },
      select: {
        id: true,
        authenticators: { select: { credentialID: true, transports: true } },
      },
    });
    if (user) {
      userId = user.id;
      allow = user.authenticators.map((a) => ({
        id: a.credentialID,
        transports: (a.transports?.split(',').filter(Boolean) ?? []) as AuthenticatorTransportFuture[],
      }));
    }
  }

  const options = await swGenerateAuthenticationOptions({
    rpID: RP_ID,
    // If no email or no creds for that email, leave allowCredentials
    // empty: browser will offer any discoverable passkey it has.
    allowCredentials: allow.length > 0 ? allow : undefined,
    userVerification: 'preferred',
  });

  await storeChallenge({
    challenge: options.challenge,
    userId: userId ?? undefined,
    email: emailHint ?? undefined,
    purpose: 'authentication',
  });

  return options;
}

export async function verifyAuthentication(
  response: AuthenticationResponseJSON,
): Promise<
  | { ok: true; userId: string }
  | { ok: false; reason: string }
> {
  const clientChallenge = JSON.parse(
    Buffer.from(response.response.clientDataJSON, 'base64url').toString(),
  ).challenge as string;

  const consumed = await consumeChallenge(clientChallenge, 'authentication');
  if (!consumed) {
    return { ok: false, reason: 'Challenge expired or unknown.' };
  }

  const authenticator = await prisma.authenticator.findUnique({
    where: { credentialID: response.id },
    select: {
      id: true,
      userId: true,
      credentialID: true,
      credentialPublicKey: true,
      counter: true,
      transports: true,
      user: { select: { deletedAt: true } },
    },
  });
  if (!authenticator) {
    return { ok: false, reason: 'Unknown passkey.' };
  }

  // Soft-deleted users can't sign in even with a valid passkey.
  if (authenticator.user.deletedAt) {
    return { ok: false, reason: 'This account is no longer active.' };
  }

  // If the user typed an email, the credential must belong to them.
  if (consumed.userId && consumed.userId !== authenticator.userId) {
    return { ok: false, reason: 'That passkey belongs to a different account.' };
  }

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: clientChallenge,
    expectedOrigin: EXPECTED_ORIGINS,
    expectedRPID: RP_ID,
    credential: {
      id: authenticator.credentialID,
      publicKey: new Uint8Array(authenticator.credentialPublicKey),
      counter: Number(authenticator.counter),
      transports: (authenticator.transports?.split(',').filter(Boolean) ??
        []) as AuthenticatorTransportFuture[],
    },
    requireUserVerification: false,
  });

  if (!verification.verified) {
    return { ok: false, reason: 'Could not verify the passkey.' };
  }

  await prisma.authenticator.update({
    where: { id: authenticator.id },
    data: {
      counter: BigInt(verification.authenticationInfo.newCounter),
      lastUsedAt: new Date(),
    },
  });

  return { ok: true, userId: authenticator.userId };
}

// -------------------------------------------------------------------
// Account page: list + remove
// -------------------------------------------------------------------

export interface ListedAuthenticator {
  id: string;
  nickname: string | null;
  credentialDeviceType: string;
  credentialBackedUp: boolean;
  createdAt: Date;
  lastUsedAt: Date | null;
}

export async function listUserPasskeys(userId: string): Promise<ListedAuthenticator[]> {
  return prisma.authenticator.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      nickname: true,
      credentialDeviceType: true,
      credentialBackedUp: true,
      createdAt: true,
      lastUsedAt: true,
    },
  });
}
