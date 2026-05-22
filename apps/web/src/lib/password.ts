// argon2id password hashing + strength validation + per-email rate
// limiting / lockout. All in one place so the policy is auditable in
// a single file. argon2id parameters follow OWASP 2024 recommendation:
// memoryCost 19 MiB, timeCost 2, parallelism 1.

import { hash as argonHash, verify as argonVerify } from '@node-rs/argon2';

// Algorithm enum value: 2 = Argon2id. We use the literal rather than
// the enum import because @node-rs/argon2 exports Algorithm as a value
// (not a type), which trips the bundler under server-external mode.
const ALGORITHM_ARGON2ID = 2 as const;

// ----- Strength validation -------------------------------------------

const MIN_LENGTH = 12;

// Tiny banlist of the most common / project-specific weak passwords.
// We do NOT enforce mixed-case / digits / specials - NIST SP 800-63B
// considers those rules counter-productive when length is enforced.
const BANNED = new Set<string>([
  'password',
  'password1',
  'password123',
  'qwerty',
  'qwerty123',
  '123456789',
  '12345678',
  'iloveyou',
  'admin',
  'welcome',
  'letmein',
  'companion',
  'youareingoodcompany',
  'goodcompany',
]);

export interface PasswordStrengthResult {
  ok: boolean;
  reason?: string;
}

export function validatePasswordStrength(
  password: string,
  emailHint?: string,
): PasswordStrengthResult {
  if (!password) {
    return { ok: false, reason: 'Pick a password.' };
  }
  if (password.length < MIN_LENGTH) {
    return {
      ok: false,
      reason: `Use at least ${MIN_LENGTH} characters.`,
    };
  }
  if (password.length > 200) {
    return { ok: false, reason: 'Pick a shorter password (under 200 characters).' };
  }
  const lower = password.toLowerCase();
  if (BANNED.has(lower)) {
    return { ok: false, reason: 'That password is too common. Pick something less obvious.' };
  }
  if (emailHint) {
    const local = emailHint.split('@')[0]?.toLowerCase();
    if (local && local.length >= 4 && lower.includes(local)) {
      return {
        ok: false,
        reason: 'Avoid putting your email name in your password.',
      };
    }
  }
  return { ok: true };
}

// ----- argon2id hashing ----------------------------------------------

const ARGON_OPTS = {
  algorithm: ALGORITHM_ARGON2ID,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(password: string): Promise<string> {
  return argonHash(password, ARGON_OPTS);
}

export async function verifyPassword(
  hashed: string,
  password: string,
): Promise<boolean> {
  try {
    return await argonVerify(hashed, password);
  } catch (err) {
    // Malformed hash, or any unexpected failure - never throw to caller.
    // Treat as a non-match. Surface to logs for ops follow-up.
    console.error('[password] verify failed', { err });
    return false;
  }
}

// ----- Rate limiting + lockout (per-email, in-memory) ----------------
//
// Single PM2 instance for now, so in-memory is acceptable. When we move
// to multi-instance, swap the storage for Redis with the same interface.
//
// Policy: 5 failed sign-in attempts per email within 15 minutes locks
// the email out for 15 minutes. Successful sign-in clears the counter.

interface AttemptRecord {
  failures: number;
  firstFailureAt: number;
  lockedUntil: number | null;
}

const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;

const attempts = new Map<string, AttemptRecord>();

function keyOf(email: string): string {
  return email.trim().toLowerCase();
}

export interface LockoutState {
  locked: boolean;
  unlockAtMs: number | null;
  remainingAttempts: number;
}

export function checkLockout(email: string): LockoutState {
  const key = keyOf(email);
  const rec = attempts.get(key);
  if (!rec) return { locked: false, unlockAtMs: null, remainingAttempts: MAX_FAILURES };
  const now = Date.now();
  if (rec.lockedUntil && rec.lockedUntil > now) {
    return { locked: true, unlockAtMs: rec.lockedUntil, remainingAttempts: 0 };
  }
  if (rec.lockedUntil && rec.lockedUntil <= now) {
    // Lock expired - reset.
    attempts.delete(key);
    return { locked: false, unlockAtMs: null, remainingAttempts: MAX_FAILURES };
  }
  // Within the failure window?
  if (now - rec.firstFailureAt > WINDOW_MS) {
    attempts.delete(key);
    return { locked: false, unlockAtMs: null, remainingAttempts: MAX_FAILURES };
  }
  return {
    locked: false,
    unlockAtMs: null,
    remainingAttempts: Math.max(0, MAX_FAILURES - rec.failures),
  };
}

export function recordFailure(email: string): LockoutState {
  const key = keyOf(email);
  const now = Date.now();
  const rec = attempts.get(key);
  if (!rec || now - rec.firstFailureAt > WINDOW_MS) {
    attempts.set(key, { failures: 1, firstFailureAt: now, lockedUntil: null });
    return { locked: false, unlockAtMs: null, remainingAttempts: MAX_FAILURES - 1 };
  }
  rec.failures += 1;
  if (rec.failures >= MAX_FAILURES) {
    rec.lockedUntil = now + LOCK_MS;
    attempts.set(key, rec);
    return { locked: true, unlockAtMs: rec.lockedUntil, remainingAttempts: 0 };
  }
  attempts.set(key, rec);
  return {
    locked: false,
    unlockAtMs: null,
    remainingAttempts: MAX_FAILURES - rec.failures,
  };
}

export function clearAttempts(email: string): void {
  attempts.delete(keyOf(email));
}
