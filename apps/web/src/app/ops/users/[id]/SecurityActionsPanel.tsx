'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useState } from 'react';
import { LogOut, KeyRound, Fingerprint, AlertTriangle } from 'lucide-react';
import {
  forceSignOutAllSessions,
  forceResetPassword,
  revokePasskeyAsAdmin,
  type SecurityActionState,
} from '@/lib/user-admin';

const initial: SecurityActionState = { ok: false };

interface Passkey {
  id: string;
  nickname: string | null;
  lastUsedAt: string | null;
}

interface Props {
  userId: string;
  actorRole: string;
  isSelf: boolean;
  isDeleted: boolean;
  hasPassword: boolean;
  activeSessionCount: number;
  passkeys: Passkey[];
}

export function SecurityActionsPanel({
  userId,
  actorRole,
  isSelf,
  isDeleted,
  hasPassword,
  activeSessionCount,
  passkeys,
}: Props) {
  const isAdmin = actorRole === 'operator_admin';
  const canResetPassword =
    isAdmin || actorRole === 'operator_safeguarding';

  if (isSelf) {
    return (
      <section className="bg-cream-deep/40 border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
        <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-2 flex items-center gap-2">
          <AlertTriangle size={14} strokeWidth={1.75} className="text-amber-700" aria-hidden="true" />
          Your own account
        </h2>
        <p className="text-charcoal text-[0.875rem] leading-[1.55]">
          Sign-out, password change, and passkey management for your own
          account live on{' '}
          <a href="/ops/account" className="link">
            your account page
          </a>
          .
        </p>
      </section>
    );
  }

  if (isDeleted || (!isAdmin && !canResetPassword)) {
    return null;
  }

  return (
    <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
      <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-3 flex items-center gap-2">
        <AlertTriangle size={14} strokeWidth={1.75} className="text-terracotta" aria-hidden="true" />
        Security actions
      </h2>
      <p className="text-stone text-[0.875rem] mb-4">
        Destructive. Each action is audit-logged and the user is emailed.
      </p>

      <div className="flex flex-col gap-4">
        {isAdmin ? (
          <ForceSignOutForm
            userId={userId}
            disabled={activeSessionCount === 0}
            activeSessionCount={activeSessionCount}
          />
        ) : null}
        {canResetPassword ? (
          <ForceResetForm
            userId={userId}
            hasPassword={hasPassword}
          />
        ) : null}
        {isAdmin && passkeys.length > 0 ? (
          <RevokePasskeyList userId={userId} passkeys={passkeys} />
        ) : null}
      </div>
    </section>
  );
}

// --------------------------------------------------------------------
// Force sign-out
// --------------------------------------------------------------------
function ForceSignOutForm({
  userId,
  disabled,
  activeSessionCount,
}: {
  userId: string;
  disabled: boolean;
  activeSessionCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [state, action] = useFormState(forceSignOutAllSessions, initial);

  return (
    <div className="border border-moss/10 rounded-md p-3 bg-cream">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-charcoal text-[0.9375rem] font-medium flex items-center gap-2">
            <LogOut size={14} strokeWidth={1.75} className="text-terracotta" aria-hidden="true" />
            Force sign-out of all devices
          </div>
          <div className="text-stone text-[0.8125rem] mt-0.5">
            {disabled
              ? 'No active sessions to revoke.'
              : `Revokes ${activeSessionCount} active session${activeSessionCount === 1 ? '' : 's'}.`}
          </div>
        </div>
        {!disabled ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-stone hover:text-moss text-[0.8125rem]"
          >
            {open ? 'Cancel' : 'Start'}
          </button>
        ) : null}
      </div>
      {open ? (
        <form action={action} className="mt-3 flex flex-col gap-2" noValidate>
          <input type="hidden" name="userId" value={userId} />
          <textarea
            name="reason"
            required
            rows={2}
            maxLength={500}
            placeholder="Why are you signing this user out?"
            className="bg-paper border border-moss/15 rounded-md px-3 py-2 text-charcoal text-[0.875rem] focus:outline-none focus:ring-2 focus:ring-moss/25 focus:border-moss/40"
          />
          {state.error ? (
            <p className="text-terracotta text-[0.8125rem]">{state.error}</p>
          ) : null}
          <SubmitButton label="Force sign-out" pendingLabel="Signing out…" />
        </form>
      ) : null}
    </div>
  );
}

// --------------------------------------------------------------------
// Force-reset password
// --------------------------------------------------------------------
function ForceResetForm({
  userId,
  hasPassword,
}: {
  userId: string;
  hasPassword: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, action] = useFormState(forceResetPassword, initial);

  return (
    <div className="border border-moss/10 rounded-md p-3 bg-cream">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-charcoal text-[0.9375rem] font-medium flex items-center gap-2">
            <KeyRound size={14} strokeWidth={1.75} className="text-terracotta" aria-hidden="true" />
            Force-reset password
          </div>
          <div className="text-stone text-[0.8125rem] mt-0.5">
            {hasPassword
              ? 'Clears the password + revokes every session. User signs back in via magic-link.'
              : 'User has no password set. Revokes any active sessions and emails the user.'}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-stone hover:text-moss text-[0.8125rem]"
        >
          {open ? 'Cancel' : 'Start'}
        </button>
      </div>
      {open ? (
        <form action={action} className="mt-3 flex flex-col gap-2" noValidate>
          <input type="hidden" name="userId" value={userId} />
          <textarea
            name="reason"
            required
            rows={2}
            maxLength={500}
            placeholder="Why are you resetting this password?"
            className="bg-paper border border-moss/15 rounded-md px-3 py-2 text-charcoal text-[0.875rem] focus:outline-none focus:ring-2 focus:ring-moss/25 focus:border-moss/40"
          />
          {state.error ? (
            <p className="text-terracotta text-[0.8125rem]">{state.error}</p>
          ) : null}
          <SubmitButton label="Force-reset password" pendingLabel="Resetting…" />
        </form>
      ) : null}
    </div>
  );
}

// --------------------------------------------------------------------
// Revoke a single passkey
// --------------------------------------------------------------------
function RevokePasskeyList({
  userId,
  passkeys,
}: {
  userId: string;
  passkeys: Passkey[];
}) {
  const [state, action] = useFormState(revokePasskeyAsAdmin, initial);
  return (
    <div className="border border-moss/10 rounded-md p-3 bg-cream">
      <div className="text-charcoal text-[0.9375rem] font-medium flex items-center gap-2 mb-2">
        <Fingerprint size={14} strokeWidth={1.75} className="text-terracotta" aria-hidden="true" />
        Revoke a passkey
      </div>
      <ul className="flex flex-col gap-1.5">
        {passkeys.map((p) => (
          <li
            key={p.id}
            className="flex items-center gap-3 text-[0.875rem] bg-paper rounded px-2 py-1.5 border border-moss/10"
          >
            <span className="text-charcoal truncate flex-1">
              {p.nickname || 'Unnamed passkey'}
            </span>
            <span className="text-stone text-[0.75rem] whitespace-nowrap">
              {p.lastUsedAt
                ? `used ${new Date(p.lastUsedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
                : 'never used'}
            </span>
            <form action={action}>
              <input type="hidden" name="userId" value={userId} />
              <input type="hidden" name="passkeyId" value={p.id} />
              <button
                type="submit"
                className="text-stone hover:text-terracotta text-[0.8125rem]"
                title="Revoke this passkey"
              >
                Revoke
              </button>
            </form>
          </li>
        ))}
      </ul>
      {state.error ? (
        <p className="text-terracotta text-[0.8125rem] mt-2">{state.error}</p>
      ) : null}
    </div>
  );
}

function SubmitButton({
  label,
  pendingLabel,
}: {
  label: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="self-start inline-flex items-center justify-center font-body text-[0.875rem] text-paper bg-terracotta hover:bg-terracotta-dark disabled:opacity-60 rounded-full px-5 py-2 transition-colors"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
