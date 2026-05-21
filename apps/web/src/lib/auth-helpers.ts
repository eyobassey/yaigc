import { redirect } from 'next/navigation';
import type { UserRole } from '@prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * Per-bounded-context access predicates. Maps each role to a coarse
 * "can access this surface" check. RBAC of specific actions is the
 * caller's responsibility once they hold the User record.
 */
export const OPERATOR_ROLES: UserRole[] = [
  'operator_coordinator',
  'operator_safeguarding',
  'operator_finance',
  'operator_admin',
  'operator_read_only',
];

export const FAMILY_ROLES: UserRole[] = ['family_payer', 'family_viewer'];
export const COMPANION_ROLES: UserRole[] = ['companion'];

export function isOperator(role: UserRole | null | undefined) {
  return role != null && OPERATOR_ROLES.includes(role);
}

/**
 * The fully-resolved user including business fields the session does
 * not carry. Auth.js's session only exposes id/email/name/image by
 * default; for everything else we fetch the User record.
 */
export type SessionUser = {
  id: string;
  email: string;
  role: UserRole;
  firstName: string | null;
  lastName: string | null;
};

/**
 * Resolve the signed-in user with full DB fields, or null. Returns null
 * for unauthenticated requests; throws if the session references a user
 * that no longer exists (race condition / stale token).
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      role: true,
      firstName: true,
      lastName: true,
    },
  });
  return user;
}

/**
 * Server-component guard: if the visitor isn't signed in, redirect to
 * /sign-in with a callbackUrl. If they're signed in but don't have an
 * operator role, redirect to /no-access. Returns the resolved user on
 * success so the page can use their role for sub-gating.
 */
export async function requireOperator(callbackPath: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect(`/sign-in?callbackUrl=${encodeURIComponent(callbackPath)}`);
  }
  if (!isOperator(user.role)) {
    redirect('/no-access');
  }
  return user;
}
