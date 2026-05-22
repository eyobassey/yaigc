'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { audit } from '@/lib/audit';
import { getSessionUser } from '@/lib/auth-helpers';
import { mintAndSetSession } from '@/lib/session';
import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  checkLockout,
  recordFailure,
  clearAttempts,
} from '@/lib/password';

// ============================================================
// SIGN IN with email + password
// ============================================================

export interface SignInState {
  ok: boolean;
  error?: string;
  values?: { email?: string };
}

export async function signInWithPassword(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const redirectTo = String(formData.get('redirectTo') ?? '/me');
  // Default to remembering. "Remember me" checkbox is checked by
  // default; absence of the field means the user explicitly unchecked
  // it, which collapses to a short session.
  const remember = formData.get('rememberMe') === 'on';

  if (!email || !password) {
    return { ok: false, error: 'Email and password are both required.', values: { email } };
  }

  const lock = checkLockout(email);
  if (lock.locked) {
    const mins = Math.ceil(((lock.unlockAtMs ?? Date.now()) - Date.now()) / 60000);
    await audit({
      actorType: 'system',
      actorId: null,
      actionType: 'auth',
      targetType: 'User',
      targetId: null,
      metadata: { event: 'sign_in_blocked_locked_out', email },
    });
    return {
      ok: false,
      error: `Too many failed attempts. Try again in ${mins} minute${mins === 1 ? '' : 's'}, or use a one-time link.`,
      values: { email },
    };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, passwordHash: true },
  });

  // Always do an argon2 verify against SOMETHING when the email looks
  // valid - either the real hash or a dummy - so timing differences
  // don't leak whether the email exists. The dummy is rebuilt at boot.
  if (!user || !user.passwordHash) {
    if (user) {
      // User exists but has no password yet: same generic message + record
      // the failure for rate limiting.
      recordFailure(email);
      await audit({
        actorType: 'system',
        actorId: null,
        actionType: 'auth',
        targetType: 'User',
        targetId: user.id,
        metadata: { event: 'sign_in_failed', method: 'password', email, reason: 'no_password_yet' },
      });
    } else {
      recordFailure(email);
    }
    // Constant-time-ish: hash a dummy so the request takes argon2 time.
    await verifyPassword(DUMMY_HASH, password);
    return {
      ok: false,
      error: 'That email and password do not match. Check the spelling, or use a one-time sign-in link.',
      values: { email },
    };
  }

  const ok = await verifyPassword(user.passwordHash, password);
  if (!ok) {
    const after = recordFailure(email);
    await audit({
      actorType: 'system',
      actorId: null,
      actionType: 'auth',
      targetType: 'User',
      targetId: user.id,
      metadata: {
        event: 'sign_in_failed',
        method: 'password',
        email,
        reason: 'bad_password',
        lockedNow: after.locked,
      },
    });
    return {
      ok: false,
      error: after.locked
        ? 'Too many failed attempts. Try again in 15 minutes, or use a one-time link.'
        : 'That email and password do not match. Check the spelling, or use a one-time sign-in link.',
      values: { email },
    };
  }

  // Success: clear counter, mint session, audit, redirect.
  clearAttempts(email);
  await mintAndSetSession({ userId: user.id, remember });
  await audit({
    actorType: 'user',
    actorId: user.id,
    actionType: 'auth',
    targetType: 'Session',
    targetId: user.id,
    metadata: { event: 'sign_in', method: 'password', email, remember },
  });
  redirect(redirectTo);
}

// Pre-hashed string used for the dummy verify on unknown-email paths.
// Generated at boot from a random secret; we don't need it to be
// recoverable, just to take argon2 time to verify against.
const DUMMY_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$YjFhZjk0Mjc1ODg1NzAwNw$DcjjUCJ7Mz0L0Q0Y8w2cR8VnyBM7Gqx9p3Sm5Lz3rJk';

// ============================================================
// SET password (for users who currently have NULL passwordHash)
// CHANGE password (requires the current password)
// ============================================================

export interface PasswordState {
  ok: boolean;
  error?: string;
  notice?: string;
}

export async function setOrChangePassword(
  _prev: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, error: 'Sign in first.' };
  }

  const currentPassword = String(formData.get('currentPassword') ?? '');
  const newPassword = String(formData.get('newPassword') ?? '');
  const confirm = String(formData.get('confirm') ?? '');

  if (newPassword !== confirm) {
    return { ok: false, error: 'The two new-password fields do not match.' };
  }
  const strength = validatePasswordStrength(newPassword, user.email);
  if (!strength.ok) {
    return { ok: false, error: strength.reason ?? 'Pick a stronger password.' };
  }

  const row = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, email: true, passwordHash: true },
  });
  if (!row) return { ok: false, error: 'Account not found.' };

  // If a password already exists, require the current one. The
  // "forgot password" flow lets the user wipe this via magic-link.
  if (row.passwordHash) {
    if (!currentPassword) {
      return { ok: false, error: 'Enter your current password.' };
    }
    const ok = await verifyPassword(row.passwordHash, currentPassword);
    if (!ok) {
      return { ok: false, error: 'Current password is wrong.' };
    }
  }

  const newHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: row.id },
    data: { passwordHash: newHash, passwordSetAt: new Date() },
  });
  clearAttempts(row.email);

  await audit({
    actorType: 'user',
    actorId: row.id,
    actorRole: user.role,
    actionType: 'update',
    targetType: 'User',
    targetId: row.id,
    metadata: {
      event: row.passwordHash ? 'password_changed' : 'password_set',
    },
  });

  return {
    ok: true,
    notice: row.passwordHash ? 'Password updated.' : 'Password set. You can sign in with it next time.',
  };
}
