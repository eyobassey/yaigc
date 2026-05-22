'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useState } from 'react';
import { Trash2, RotateCcw, AlertTriangle } from 'lucide-react';
import {
  softDeleteUser,
  restoreUser,
  type SecurityActionState,
} from '@/lib/user-admin';

const initial: SecurityActionState = { ok: false };

interface Props {
  userId: string;
  actorRole: string;
  isSelf: boolean;
  isDeleted: boolean;
  deletedAt: string | null;
}

// Soft-delete is destructive (blocks sign-in, revokes sessions, clears
// password). Restore unwinds the tombstone. Both are admin-only.

export function DeletePanel({
  userId,
  actorRole,
  isSelf,
  isDeleted,
  deletedAt,
}: Props) {
  if (actorRole !== 'operator_admin') return null;
  if (isSelf) return null;

  return isDeleted ? (
    <RestoreSection userId={userId} deletedAt={deletedAt} />
  ) : (
    <DeleteSection userId={userId} />
  );
}

function DeleteSection({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useFormState(softDeleteUser, initial);

  return (
    <section className="bg-paper border border-terracotta/30 rounded-[12px] p-5 sm:p-6">
      <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-terracotta mb-3 flex items-center gap-2">
        <AlertTriangle size={14} strokeWidth={1.75} aria-hidden="true" />
        Close account
      </h2>
      <p className="text-charcoal text-[0.875rem] leading-[1.55] mb-3">
        Soft-deletes the user. They will no longer be able to sign in.
        Their data stays in the database for the audit trail. The user
        is emailed. Can be reversed by restoring.
      </p>
      {open ? (
        <form action={action} className="flex flex-col gap-2" noValidate>
          <input type="hidden" name="userId" value={userId} />
          <textarea
            name="reason"
            required
            rows={2}
            maxLength={500}
            placeholder="Why are you closing this account?"
            className="bg-cream border border-moss/15 rounded-md px-3 py-2 text-charcoal text-[0.875rem] focus:outline-none focus:ring-2 focus:ring-terracotta/25 focus:border-terracotta/40"
          />
          {state.error ? (
            <p className="text-terracotta text-[0.8125rem]">{state.error}</p>
          ) : null}
          <div className="flex items-center gap-2">
            <SubmitButton label="Close account" pendingLabel="Closing…" />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-stone hover:text-moss text-[0.8125rem]"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 font-body text-[0.875rem] text-paper bg-terracotta hover:bg-terracotta-dark rounded-full px-5 py-2 transition-colors"
        >
          <Trash2 size={14} strokeWidth={1.75} aria-hidden="true" />
          Close this account
        </button>
      )}
    </section>
  );
}

function RestoreSection({
  userId,
  deletedAt,
}: {
  userId: string;
  deletedAt: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [state, action] = useFormState(restoreUser, initial);
  const date = deletedAt
    ? new Date(deletedAt).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  return (
    <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
      <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-3 flex items-center gap-2">
        <RotateCcw size={14} strokeWidth={1.75} className="text-moss" aria-hidden="true" />
        Restore account
      </h2>
      <p className="text-charcoal text-[0.875rem] leading-[1.55] mb-3">
        This account was closed{date ? ` on ${date}` : ''}. Restoring
        unwinds the tombstone. Sessions stay revoked and the password
        stays cleared - the user will need to sign in via a one-time
        link and set a new password.
      </p>
      {open ? (
        <form action={action} className="flex flex-col gap-2" noValidate>
          <input type="hidden" name="userId" value={userId} />
          <textarea
            name="reason"
            required
            rows={2}
            maxLength={500}
            placeholder="Why are you restoring this account?"
            className="bg-cream border border-moss/15 rounded-md px-3 py-2 text-charcoal text-[0.875rem] focus:outline-none focus:ring-2 focus:ring-moss/25 focus:border-moss/40"
          />
          {state.error ? (
            <p className="text-terracotta text-[0.8125rem]">{state.error}</p>
          ) : null}
          <div className="flex items-center gap-2">
            <SubmitButton label="Restore account" pendingLabel="Restoring…" tone="moss" />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-stone hover:text-moss text-[0.8125rem]"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 font-body text-[0.875rem] text-paper bg-moss hover:bg-moss-deep rounded-full px-5 py-2 transition-colors"
        >
          <RotateCcw size={14} strokeWidth={1.75} aria-hidden="true" />
          Restore this account
        </button>
      )}
    </section>
  );
}

function SubmitButton({
  label,
  pendingLabel,
  tone = 'terracotta',
}: {
  label: string;
  pendingLabel: string;
  tone?: 'terracotta' | 'moss';
}) {
  const { pending } = useFormStatus();
  const cls =
    tone === 'moss'
      ? 'bg-moss hover:bg-moss-deep'
      : 'bg-terracotta hover:bg-terracotta-dark';
  return (
    <button
      type="submit"
      disabled={pending}
      className={`self-start inline-flex items-center justify-center font-body text-[0.875rem] text-paper ${cls} disabled:opacity-60 rounded-full px-5 py-2 transition-colors`}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
