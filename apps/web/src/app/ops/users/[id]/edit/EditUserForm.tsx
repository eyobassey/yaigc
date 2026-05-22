'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useId } from 'react';
import { editUserByAdmin, type EditUserState } from '@/lib/user-admin';

const initial: EditUserState = { ok: false };

const ROLES: { value: string; label: string; hint?: string }[] = [
  { value: 'family_payer', label: 'Family payer', hint: 'Pays + manages a household.' },
  { value: 'family_viewer', label: 'Family viewer', hint: 'Read-only family member.' },
  { value: 'companion', label: 'Companion', hint: 'Linked to a Companion record.' },
  { value: 'operator_coordinator', label: 'Coordinator', hint: 'Day-to-day operator.' },
  { value: 'operator_safeguarding', label: 'Safeguarding lead', hint: 'Cases + escalations.' },
  { value: 'operator_finance', label: 'Finance', hint: 'Payments + invoicing.' },
  { value: 'operator_admin', label: 'Admin', hint: 'Full access. Use sparingly.' },
  { value: 'operator_read_only', label: 'Read-only', hint: 'Observer / auditor / investor.' },
];

interface Props {
  userId: string;
  email: string;
  initial: { firstName: string; lastName: string; role: string };
  disabled: boolean;
  isSelf: boolean;
}

export function EditUserForm({
  userId,
  email,
  initial: init,
  disabled,
  isSelf,
}: Props) {
  const [state, action] = useFormState(editUserByAdmin, initial);

  const firstName = state.values?.firstName ?? init.firstName;
  const lastName = state.values?.lastName ?? init.lastName;
  const role = state.values?.role ?? init.role;

  return (
    <form
      action={action}
      noValidate
      className="bg-paper border border-moss/[0.08] rounded-[20px] p-[clamp(1.5rem,3vw,2.25rem)] flex flex-col gap-6"
    >
      <input type="hidden" name="userId" value={userId} />

      {state.error ? (
        <p className="bg-terracotta/10 border-l-4 border-terracotta px-4 py-3 rounded-r text-[0.9375rem] text-charcoal">
          {state.error}
        </p>
      ) : null}
      {state.notice ? (
        <p className="bg-moss/10 border-l-4 border-moss px-4 py-3 rounded-r text-[0.9375rem] text-charcoal">
          {state.notice}
        </p>
      ) : null}

      <fieldset className="flex flex-col gap-4">
        <legend className="font-body text-[0.7rem] font-medium uppercase tracking-[0.1em] text-stone">
          About
        </legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field name="firstName" label="First name" defaultValue={firstName} />
          <Field name="lastName" label="Last name" defaultValue={lastName} />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-charcoal text-[0.9375rem]">Email</span>
          <p className="text-stone text-[0.875rem] font-mono break-all">{email}</p>
          <p className="text-stone text-[0.8125rem]">
            Email is locked here for v1. To change it, ask the user to email us
            and we'll update it via the database with a confirm-by-link step.
          </p>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="font-body text-[0.7rem] font-medium uppercase tracking-[0.1em] text-stone">
          Role
        </legend>
        {isSelf ? (
          <p className="bg-amber-50/60 border-l-4 border-amber-300 px-4 py-3 rounded-r text-[0.9375rem] text-charcoal">
            You are editing your own account. Demoting yourself away from
            admin works only if another active admin exists; otherwise
            you would be locked out of admin actions.
          </p>
        ) : null}
        <div className="flex flex-col gap-2">
          {ROLES.map((r) => (
            <label
              key={r.value}
              className={`flex items-start gap-3 px-3 py-2 rounded-md border cursor-pointer transition-colors ${
                role === r.value
                  ? 'border-moss/40 bg-moss/5'
                  : 'border-moss/15 hover:border-moss/30'
              }`}
            >
              <input
                type="radio"
                name="role"
                value={r.value}
                defaultChecked={role === r.value}
                className="mt-1 w-4 h-4 border-moss/30 text-moss focus:ring-moss/30"
              />
              <div>
                <div className="text-charcoal text-[0.9375rem] font-medium">
                  {r.label}
                </div>
                {r.hint ? (
                  <div className="text-stone text-[0.8125rem]">{r.hint}</div>
                ) : null}
              </div>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex items-center gap-3 flex-wrap">
        <SubmitButton disabled={disabled} />
        <a
          href={`/ops/users/${userId}`}
          className="text-stone hover:text-moss text-[0.875rem]"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="inline-flex items-center justify-center font-body text-[0.9375rem] text-paper bg-moss hover:bg-moss-deep disabled:opacity-60 disabled:cursor-not-allowed rounded-full px-6 py-2.5 transition-colors"
    >
      {pending ? 'Saving…' : 'Save changes'}
    </button>
  );
}

function Field({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue: string;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-charcoal text-[0.9375rem]">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type="text"
        defaultValue={defaultValue}
        className="bg-cream border border-moss/15 rounded-md px-3 py-2 text-charcoal focus:outline-none focus:ring-2 focus:ring-moss/25 focus:border-moss/40"
      />
    </div>
  );
}
