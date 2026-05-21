import { redirect } from 'next/navigation';
import type { Family, FamilyMember, UserRole } from '@prisma/client';
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

export function isFamily(role: UserRole | null | undefined) {
  return role != null && FAMILY_ROLES.includes(role);
}

export function isCompanion(role: UserRole | null | undefined) {
  return role != null && COMPANION_ROLES.includes(role);
}

/**
 * Default landing per role. Where we send a freshly-signed-in user
 * when no callbackUrl was provided.
 */
export function defaultLandingForRole(role: UserRole): string {
  if (isOperator(role)) return '/ops';
  if (isFamily(role)) return '/family';
  if (isCompanion(role)) return '/companion'; // Phase 2
  return '/me';
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

// ---------------------------------------------------------------------------
// Family portal helpers.
//
// A FamilyMember row joins a User to a Family. The portal only renders for
// users that have BOTH a family role AND an active FamilyMember row. The
// two-check approach catches the edge case where someone has been promoted
// to family_payer (e.g. by operator action) but no Family has been built
// for them yet - they get bounced to /no-access rather than seeing an
// empty portal.
// ---------------------------------------------------------------------------

export type FamilyContext = {
  user: SessionUser;
  member: FamilyMember;
  family: Family;
};

/**
 * Server-component guard for any /family route. Returns the user, their
 * FamilyMember row, and the resolved Family. Redirects:
 *   - not signed in -> /sign-in?callbackUrl=<path>
 *   - operator role -> /ops (wrong portal)
 *   - companion role -> /companion (Phase 2; today /no-access)
 *   - family role but no FamilyMember row -> /no-access
 */
export async function requireFamilyMember(callbackPath: string): Promise<FamilyContext> {
  const user = await getSessionUser();
  if (!user) {
    redirect(`/sign-in?callbackUrl=${encodeURIComponent(callbackPath)}`);
  }
  if (isOperator(user.role)) redirect('/ops');
  if (isCompanion(user.role)) redirect('/no-access'); // Phase 2: /companion
  if (!isFamily(user.role)) redirect('/no-access');

  const member = await prisma.familyMember.findFirst({
    where: { userId: user.id, deletedAt: null },
    include: { family: true },
  });
  if (!member) redirect('/no-access');

  const { family, ...memberRow } = member;
  return { user, member: memberRow, family };
}

/**
 * Like requireFamilyMember but additionally requires payer role on the
 * FamilyMember row. For routes that perform write actions (consent
 * toggles, schedule requests, account edits).
 */
export async function requireFamilyPayer(callbackPath: string): Promise<FamilyContext> {
  const ctx = await requireFamilyMember(callbackPath);
  if (ctx.member.role !== 'payer') redirect('/no-access');
  return ctx;
}
