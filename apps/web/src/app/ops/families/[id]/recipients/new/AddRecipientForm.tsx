'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { addRecipient, type AddRecipientState } from '@/lib/family-add';
import { Field, Section } from '@/app/ops/_components/EditField';

const initial: AddRecipientState = { ok: false };

export function AddRecipientForm({ familyId }: { familyId: string }) {
  const [state, action] = useFormState(addRecipient, initial);

  return (
    <form action={action} noValidate className="flex flex-col gap-6">
      <input type="hidden" name="familyId" value={familyId} />

      {state.errors?._form ? (
        <div className="bg-terracotta/10 border-l-4 border-terracotta px-4 py-3 rounded-r text-charcoal text-[0.9375rem]">
          {state.errors._form}
        </div>
      ) : null}

      <Section title="Name">
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
        <Field
          name="preferredName"
          label="Preferred name (optional)"
          defaultValue={state.values?.preferredName}
          hint="What the companion should call them."
          error={state.errors?.preferredName}
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
      {pending ? 'Adding…' : 'Add recipient'}
    </button>
  );
}
