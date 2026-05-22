'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createTransport } from 'nodemailer';
import type { UserRole } from '@prisma/client';
import { brand } from '@igc/content';
import { prisma } from '@/lib/prisma';
import { audit } from '@/lib/audit';
import { getSessionUser, isOperator } from '@/lib/auth-helpers';
import {
  userRoleChangedHtml,
  userRoleChangedText,
  userRoleChangedSubject,
} from '@/lib/email/user-role-changed';
import {
  userForceSignedOutHtml,
  userForceSignedOutText,
  userForceSignedOutSubject,
} from '@/lib/email/user-force-signed-out';
import {
  userPasswordForceResetHtml,
  userPasswordForceResetText,
  userPasswordForceResetSubject,
} from '@/lib/email/user-password-force-reset';

// O.14.2: operator_admin can update another user's role, first name,
// and last name. Email is locked in this stage (changing email needs a
// confirm-by-link flow we haven't built yet).
//
// Edge cases:
//   - operator_admin only. Other operator_* roles cannot edit users.
//   - Last-admin lock: cannot demote the only remaining operator_admin.
//   - Self protection: an admin CAN edit their own name. Their own
//     role demotion is permitted only when another active admin exists
//     (the last-admin lock covers this).
//   - Soft-deleted users cannot be edited (no point; restore first).

const ROLES = [
  'family_payer',
  'family_viewer',
  'companion',
  'operator_coordinator',
  'operator_safeguarding',
  'operator_finance',
  'operator_admin',
  'operator_read_only',
] as const;

const EditSchema = z.object({
  userId: z.string().min(1),
  firstName: z.string().trim().max(80).optional(),
  lastName: z.string().trim().max(80).optional(),
  role: z.enum(ROLES),
});

export type EditUserState = {
  ok: boolean;
  error?: string;
  notice?: string;
  values?: {
    firstName?: string;
    lastName?: string;
    role?: string;
  };
};

function buildTransport() {
  return createTransport({
    host: process.env.SMTP_HOST!,
    port: Number(process.env.SMTP_PORT ?? 587),
    auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASSWORD! },
  });
}

async function emailRoleChange(input: {
  to: string;
  firstName: string | null;
  beforeRole: string;
  afterRole: string;
}): Promise<void> {
  try {
    const transport = buildTransport();
    await transport.sendMail({
      to: input.to,
      from: `${brand.fullName} <${process.env.EMAIL_SENDER}>`,
      subject: userRoleChangedSubject(),
      text: userRoleChangedText({
        firstName: input.firstName,
        beforeRole: input.beforeRole,
        afterRole: input.afterRole,
      }),
      html: userRoleChangedHtml({
        firstName: input.firstName,
        beforeRole: input.beforeRole,
        afterRole: input.afterRole,
      }),
    });
  } catch (err) {
    // A failed email must not block the audit-logged change. Log
    // and continue; the audit row records the actual change.
    console.error('[user-admin] role-change email failed', { to: input.to, err });
  }
}

export async function editUserByAdmin(
  _prev: EditUserState,
  formData: FormData,
): Promise<EditUserState> {
  const actor = await getSessionUser();
  if (!actor) return { ok: false, error: 'Sign in first.' };
  if (actor.role !== 'operator_admin') {
    return { ok: false, error: 'Only admins can edit users.' };
  }

  const raw = {
    userId: String(formData.get('userId') ?? ''),
    firstName: String(formData.get('firstName') ?? '').trim() || undefined,
    lastName: String(formData.get('lastName') ?? '').trim() || undefined,
    role: String(formData.get('role') ?? ''),
  };
  const parsed = EditSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid input.',
      values: {
        firstName: raw.firstName,
        lastName: raw.lastName,
        role: raw.role,
      },
    };
  }
  const d = parsed.data;

  const before = await prisma.user.findUnique({
    where: { id: d.userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      deletedAt: true,
    },
  });
  if (!before) return { ok: false, error: 'User not found.' };
  if (before.deletedAt) {
    return {
      ok: false,
      error: 'This user is soft-deleted. Restore them first.',
    };
  }

  const roleChanged = before.role !== d.role;
  const nameChanged =
    (before.firstName ?? '') !== (d.firstName ?? '') ||
    (before.lastName ?? '') !== (d.lastName ?? '');

  // Last-admin lock. Fires whether the actor is editing themselves or
  // someone else: we never let the only operator_admin be demoted.
  if (before.role === 'operator_admin' && d.role !== 'operator_admin') {
    const count = await prisma.user.count({
      where: { role: 'operator_admin', deletedAt: null },
    });
    if (count <= 1) {
      return {
        ok: false,
        error:
          'This is the only admin on the platform. Promote a second admin first, then come back to demote this one.',
        values: {
          firstName: d.firstName,
          lastName: d.lastName,
          role: d.role,
        },
      };
    }
  }

  if (!roleChanged && !nameChanged) {
    return { ok: true, notice: 'No changes.' };
  }

  await prisma.user.update({
    where: { id: d.userId },
    data: {
      firstName: d.firstName ?? null,
      lastName: d.lastName ?? null,
      role: d.role as UserRole,
    },
  });

  await audit({
    actorType: 'user',
    actorId: actor.id,
    actorRole: actor.role,
    actionType: 'update',
    targetType: 'User',
    targetId: d.userId,
    beforeState: {
      firstName: before.firstName,
      lastName: before.lastName,
      role: before.role,
    },
    afterState: {
      firstName: d.firstName ?? null,
      lastName: d.lastName ?? null,
      role: d.role,
    },
    metadata: {
      event: 'user_edited_by_admin',
      roleChanged,
      nameChanged,
    },
  });

  if (roleChanged) {
    await emailRoleChange({
      to: before.email,
      firstName: d.firstName ?? before.firstName,
      beforeRole: before.role,
      afterRole: d.role,
    });
  }

  revalidatePath(`/ops/users/${d.userId}`);
  revalidatePath('/ops/users');
  redirect(`/ops/users/${d.userId}`);
}

// Convenience: a server-side check the edit page uses to decide
// whether to render the form at all. Centralised so we don't drift.
export async function canEditUsers(): Promise<boolean> {
  const u = await getSessionUser();
  return Boolean(u && isOperator(u.role) && u.role === 'operator_admin');
}

// ====================================================================
// O.14.3 - Security actions
//
// Three destructive actions that an operator can take against a user.
// Each one:
//   - Auth-gated (admin only; force-reset is also safeguarding-allowed).
//   - Self-protected: you can't run these against your own account
//     via /ops/users. Use the per-user account page for those instead.
//   - Reason is required free-text - captured in the audit log so we
//     can review later. Not surfaced in the email.
//   - Emails the user so the action isn't silent.
//   - Audit-logged with before-state where useful.
// ====================================================================

const ReasonSchema = z.object({
  userId: z.string().min(1),
  reason: z.string().trim().min(1, 'Reason required.').max(500),
});

export type SecurityActionState = {
  ok: boolean;
  error?: string;
};

function canForceReset(role: string): boolean {
  return role === 'operator_admin' || role === 'operator_safeguarding';
}

// --------------------------------------------------------------------
// Force sign-out of every active session for a user.
// --------------------------------------------------------------------

export async function forceSignOutAllSessions(
  _prev: SecurityActionState,
  formData: FormData,
): Promise<SecurityActionState> {
  const actor = await getSessionUser();
  if (!actor) return { ok: false, error: 'Sign in first.' };
  if (actor.role !== 'operator_admin') {
    return { ok: false, error: 'Only admins can force sign-out.' };
  }

  const parsed = ReasonSchema.safeParse({
    userId: String(formData.get('userId') ?? ''),
    reason: String(formData.get('reason') ?? '').trim(),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }
  const d = parsed.data;

  if (d.userId === actor.id) {
    return {
      ok: false,
      error:
        "Use the regular sign-out on your own account page rather than this route.",
    };
  }

  const target = await prisma.user.findUnique({
    where: { id: d.userId },
    select: { id: true, email: true, firstName: true },
  });
  if (!target) return { ok: false, error: 'User not found.' };

  const { count } = await prisma.session.deleteMany({ where: { userId: d.userId } });

  await audit({
    actorType: 'user',
    actorId: actor.id,
    actorRole: actor.role,
    actionType: 'delete',
    targetType: 'Session',
    targetId: d.userId,
    metadata: {
      event: 'sessions_force_revoked_by_admin',
      revokedCount: count,
      reason: d.reason,
    },
  });

  try {
    const transport = buildTransport();
    await transport.sendMail({
      to: target.email,
      from: `${brand.fullName} <${process.env.EMAIL_SENDER}>`,
      subject: userForceSignedOutSubject(),
      text: userForceSignedOutText({ firstName: target.firstName }),
      html: userForceSignedOutHtml({ firstName: target.firstName }),
    });
  } catch (err) {
    console.error('[user-admin] force-signout email failed', { to: target.email, err });
  }

  revalidatePath(`/ops/users/${d.userId}`);
  redirect(`/ops/users/${d.userId}`);
}

// --------------------------------------------------------------------
// Force-reset password: clear the hash + revoke all sessions. User
// must use magic-link to get back in, then set a new password.
// --------------------------------------------------------------------

export async function forceResetPassword(
  _prev: SecurityActionState,
  formData: FormData,
): Promise<SecurityActionState> {
  const actor = await getSessionUser();
  if (!actor) return { ok: false, error: 'Sign in first.' };
  if (!canForceReset(actor.role)) {
    return {
      ok: false,
      error: 'Only admins or the safeguarding lead can force-reset passwords.',
    };
  }

  const parsed = ReasonSchema.safeParse({
    userId: String(formData.get('userId') ?? ''),
    reason: String(formData.get('reason') ?? '').trim(),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }
  const d = parsed.data;

  if (d.userId === actor.id) {
    return {
      ok: false,
      error: 'Use the change-password flow on your own account page instead.',
    };
  }

  const target = await prisma.user.findUnique({
    where: { id: d.userId },
    select: { id: true, email: true, firstName: true, passwordHash: true },
  });
  if (!target) return { ok: false, error: 'User not found.' };

  // Same transaction so a partial state is impossible (password
  // cleared but sessions still alive would be confusing).
  const { sessionCount } = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: d.userId },
      data: { passwordHash: null, passwordSetAt: null },
    });
    const r = await tx.session.deleteMany({ where: { userId: d.userId } });
    return { sessionCount: r.count };
  });

  await audit({
    actorType: 'user',
    actorId: actor.id,
    actorRole: actor.role,
    actionType: 'update',
    targetType: 'User',
    targetId: d.userId,
    metadata: {
      event: 'password_force_reset_by_admin',
      hadPassword: Boolean(target.passwordHash),
      sessionsRevoked: sessionCount,
      reason: d.reason,
    },
  });

  try {
    const transport = buildTransport();
    await transport.sendMail({
      to: target.email,
      from: `${brand.fullName} <${process.env.EMAIL_SENDER}>`,
      subject: userPasswordForceResetSubject(),
      text: userPasswordForceResetText({ firstName: target.firstName }),
      html: userPasswordForceResetHtml({ firstName: target.firstName }),
    });
  } catch (err) {
    console.error('[user-admin] password-force-reset email failed', { to: target.email, err });
  }

  revalidatePath(`/ops/users/${d.userId}`);
  redirect(`/ops/users/${d.userId}`);
}

// --------------------------------------------------------------------
// Revoke a single passkey on behalf of the user. Admin-only. We do
// NOT email - removing a single passkey is a common cleanup action
// (lost device etc) and the user already sees the change on their
// own account page.
// --------------------------------------------------------------------

const RevokePasskeySchema = z.object({
  userId: z.string().min(1),
  passkeyId: z.string().min(1),
});

export async function revokePasskeyAsAdmin(
  _prev: SecurityActionState,
  formData: FormData,
): Promise<SecurityActionState> {
  const actor = await getSessionUser();
  if (!actor) return { ok: false, error: 'Sign in first.' };
  if (actor.role !== 'operator_admin') {
    return { ok: false, error: 'Only admins can revoke passkeys.' };
  }

  const parsed = RevokePasskeySchema.safeParse({
    userId: String(formData.get('userId') ?? ''),
    passkeyId: String(formData.get('passkeyId') ?? ''),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }
  const d = parsed.data;

  if (d.userId === actor.id) {
    return {
      ok: false,
      error: 'Remove your own passkey from your account page instead.',
    };
  }

  const row = await prisma.authenticator.findUnique({
    where: { id: d.passkeyId },
    select: { id: true, userId: true, nickname: true },
  });
  if (!row || row.userId !== d.userId) {
    return { ok: false, error: 'Passkey not found for this user.' };
  }

  await prisma.authenticator.delete({ where: { id: row.id } });

  await audit({
    actorType: 'user',
    actorId: actor.id,
    actorRole: actor.role,
    actionType: 'delete',
    targetType: 'Authenticator',
    targetId: d.userId,
    metadata: {
      event: 'passkey_revoked_by_admin',
      passkeyId: row.id,
      nickname: row.nickname,
    },
  });

  revalidatePath(`/ops/users/${d.userId}`);
  redirect(`/ops/users/${d.userId}`);
}
