'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { inviteFamilyMember, type InviteState } from '@/lib/family-portal';
import { Field, Select, Section } from '@/app/ops/_components/EditField';

const RELATIONSHIP_OPTIONS = [
  { value: '', label: '— not set —' },
  { value: 'daughter', label: 'Daughter' },
  { value: 'son', label: 'Son' },
  { value: 'partner', label: 'Partner' },
  { value: 'spouse', label: 'Spouse' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'grandchild', label: 'Grandchild' },
  { value: 'other', label: 'Other' },
];

const initial: InviteState = { ok: false };

export function InviteForm() {
  const [state, action] = useFormState(inviteFamilyMember, initial);

  return (
    <form action={action} noValidate className="flex flex-col gap-6">
      {state.errors?._form ? (
        <div className="bg-terracotta/10 border-l-4 border-terracotta px-4 py-3 rounded-r text-charcoal text-[0.9375rem]">
          {state.errors._form}
        </div>
      ) : null}

      <Section title="Who they are">
        <Field
          name="firstName"
          label="First name"
          required
          autoComplete="given-name"
          defaultValue={state.values?.firstName}
          error={state.errors?.firstName}
        />
        <Field
          name="lastName"
          label="Last name"
          required
          autoComplete="family-name"
          defaultValue={state.values?.lastName}
          error={state.errors?.lastName}
        />
        <Field
          name="email"
          label="Email"
          type="email"
          required
          autoComplete="email"
          defaultValue={state.values?.email}
          error={state.errors?.email}
          hint="We email them a one-time sign-in link."
        />
        <Select
          name="relationshipToRecipient"
          label="Relationship to the recipient (optional)"
          options={RELATIONSHIP_OPTIONS}
          defaultValue={state.values?.relationshipToRecipient ?? ''}
          error={state.errors?.relationshipToRecipient}
        />
      </Section>

      <div className="flex flex-wrap gap-3">
        <SubmitButton />
        <a
          href="/family/account"
          className="inline-flex items-center justify-center px-6 py-3 rounded-full border border-moss text-moss text-[0.9375rem] font-medium hover:bg-moss/5 transition-colors"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center px-7 py-3 rounded-full bg-moss text-cream text-[0.9375rem] font-medium hover:bg-moss-dark transition-all duration-200 hover:shadow-lg hover:-translate-y-px disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? 'Inviting…' : 'Send invite'}
    </button>
  );
}
