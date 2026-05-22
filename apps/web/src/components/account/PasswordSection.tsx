'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useState } from 'react';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import {
  setOrChangePassword,
  type PasswordState,
} from '@/lib/auth-password';

const initial: PasswordState = { ok: false };

interface Props {
  hasPassword: boolean;
  passwordSetAt: string | null;
}

export function PasswordSection({ hasPassword, passwordSetAt }: Props) {
  const [state, action] = useFormState(setOrChangePassword, initial);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  // Optimistic switch: once the server says ok, treat the section as
  // having a password from now on. Re-render of the parent page (after
  // revalidation) will confirm.
  const effectivelyHasPassword = hasPassword || state.ok;

  return (
    <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6 mb-6">
      <h2 className="font-body text-[0.7rem] font-medium uppercase tracking-[0.1em] text-stone mb-3 flex items-center gap-2">
        <KeyRound size={12} strokeWidth={1.75} aria-hidden="true" />
        Password
      </h2>
      <p className="text-charcoal text-[0.9375rem] leading-[1.55] mb-4">
        {effectivelyHasPassword
          ? 'You can sign in with your email and password, or use a one-time link via email.'
          : 'Set a password to skip the email-link step next time. The one-time link will still work whenever you need it.'}
        {effectivelyHasPassword && passwordSetAt ? (
          <span className="text-stone text-[0.875rem] block mt-1">
            Last updated {new Date(passwordSetAt).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
            .
          </span>
        ) : null}
      </p>

      {state.notice ? (
        <p className="bg-moss/10 border-l-4 border-moss px-4 py-3 rounded-r text-[0.9375rem] text-charcoal mb-4">
          {state.notice}
        </p>
      ) : null}
      {state.error ? (
        <p className="bg-terracotta/10 border-l-4 border-terracotta px-4 py-3 rounded-r text-[0.9375rem] text-charcoal mb-4">
          {state.error}
        </p>
      ) : null}

      <form action={action} noValidate className="flex flex-col gap-3 max-w-[420px]">
        {hasPassword ? (
          <PasswordField
            name="currentPassword"
            label="Current password"
            autoComplete="current-password"
            show={showCurrent}
            onToggle={() => setShowCurrent((v) => !v)}
          />
        ) : null}
        <PasswordField
          name="newPassword"
          label={hasPassword ? 'New password' : 'New password (at least 12 characters)'}
          autoComplete="new-password"
          show={showNew}
          onToggle={() => setShowNew((v) => !v)}
        />
        <PasswordField
          name="confirm"
          label="Confirm new password"
          autoComplete="new-password"
          show={showNew}
          onToggle={() => setShowNew((v) => !v)}
          showToggle={false}
        />
        <SubmitButton hasPassword={hasPassword} />
      </form>
    </section>
  );
}

function PasswordField({
  name,
  label,
  autoComplete,
  show,
  onToggle,
  showToggle = true,
}: {
  name: string;
  label: string;
  autoComplete: string;
  show: boolean;
  onToggle: () => void;
  showToggle?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-charcoal text-[0.9375rem]">{label}</span>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          name={name}
          required
          autoComplete={autoComplete}
          className="w-full bg-cream border border-moss/15 rounded-md px-3 py-2 pr-12 text-charcoal focus:outline-none focus:ring-2 focus:ring-moss/25 focus:border-moss/40"
        />
        {showToggle ? (
          <button
            type="button"
            onClick={onToggle}
            aria-label={show ? 'Hide' : 'Show'}
            className="absolute inset-y-0 right-2 flex items-center text-stone hover:text-moss"
          >
            {show ? <EyeOff size={16} strokeWidth={1.75} /> : <Eye size={16} strokeWidth={1.75} />}
          </button>
        ) : null}
      </div>
    </label>
  );
}

function SubmitButton({ hasPassword }: { hasPassword: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="self-start inline-flex items-center justify-center font-body text-[0.875rem] text-paper bg-moss hover:bg-moss-deep disabled:opacity-60 rounded-full px-5 py-2 transition-colors mt-2"
    >
      {pending
        ? hasPassword
          ? 'Updating…'
          : 'Setting…'
        : hasPassword
        ? 'Update password'
        : 'Set password'}
    </button>
  );
}
