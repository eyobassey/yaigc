'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { addFamilyMember, type AddMemberState } from '@/lib/family-add';
import {
  Field,
  Select,
  Section,
  Checkbox,
} from '@/app/ops/_components/EditField';

const initial: AddMemberState = { ok: false };

const ROLES = [
  { value: 'payer', label: 'Payer (billing access)' },
  { value: 'viewer', label: 'Viewer (read-only)' },
] as const;

const RELATIONSHIPS = [
  { value: 'daughter', label: 'Daughter' },
  { value: 'son', label: 'Son' },
  { value: 'partner', label: 'Partner' },
  { value: 'spouse', label: 'Spouse' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'grandchild', label: 'Grandchild' },
  { value: 'other', label: 'Other' },
] as const;

export function AddMemberForm({ familyId }: { familyId: string }) {
  const [state, action] = useFormState(addFamilyMember, initial);

  return (
    <form action={action} noValidate className="flex flex-col gap-6">
      <input type="hidden" name="familyId" value={familyId} />

      {state.errors?._form ? (
        <div className="bg-terracotta/10 border-l-4 border-terracotta px-4 py-3 rounded-r text-charcoal text-[0.9375rem]">
          {state.errors._form}
        </div>
      ) : null}

      <Section title="Account">
        <Field
          name="email"
          type="email"
          label="Email"
          required
          autoComplete="email"
          defaultValue={state.values?.email}
          error={state.errors?.email}
          hint="If this person already has an account we will link them. Otherwise we create a new account."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            name="firstName"
            label="First name"
            required
            defaultValue={state.values?.firstName}
            error={state.errors?.firstName}
          />
          <Field
            name="lastName"
            label="Last name"
            required
            defaultValue={state.values?.lastName}
            error={state.errors?.lastName}
          />
        </div>
      </Section>

      <Section title="Role">
        <Select
          name="role"
          label="Account role"
          required
          options={ROLES}
          defaultValue={state.values?.role ?? 'viewer'}
          error={state.errors?.role}
        />
        <Select
          name="relationshipToRecipient"
          label="Relationship to the recipient"
          required
          options={RELATIONSHIPS}
          defaultValue={state.values?.relationshipToRecipient ?? ''}
          error={state.errors?.relationshipToRecipient}
        />
        <Checkbox
          name="isPrimaryContact"
          label="Make this person the primary contact for the family"
          hint="If on, the existing primary contact is demoted. Only one member per family can be primary."
        />
      </Section>

      <div className="flex flex-wrap gap-3">
        <SubmitButton />
        <a
          href={`/ops/families/${familyId}`}
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
      {pending ? 'Adding…' : 'Add member'}
    </button>
  );
}
