'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { updateFamily, type FamilyEditState } from '@/lib/family-edit';
import { Field, TextArea, Section } from '@/app/ops/_components/EditField';

const initial: FamilyEditState = { ok: false };

export function FamilyEditForm({
  family,
}: {
  family: {
    id: string;
    billingName: string;
    intakeNotes: string | null;
    billingAddressLine1: string | null;
    billingAddressLine2: string | null;
    billingCity: string | null;
    billingPostcode: string | null;
    billingCountry: string;
  };
}) {
  const [state, action] = useFormState(updateFamily, initial);

  return (
    <form action={action} noValidate className="flex flex-col gap-6">
      <input type="hidden" name="familyId" value={family.id} />

      {state.errors?._form ? (
        <div className="bg-terracotta/10 border-l-4 border-terracotta px-4 py-3 rounded-r text-charcoal text-[0.9375rem]">
          {state.errors._form}
        </div>
      ) : null}

      <Section title="Family">
        <Field
          name="billingName"
          label="Billing name"
          required
          defaultValue={family.billingName}
          error={state.errors?.billingName}
          hint="What appears on invoices."
        />
        <TextArea
          name="intakeNotes"
          label="Intake notes"
          defaultValue={family.intakeNotes ?? ''}
          error={state.errors?.intakeNotes}
          hint="Free-text notes from the intake call. Operator-visible."
          rows={4}
        />
      </Section>

      <Section
        title="Billing address"
        description="For invoicing. Distinct from the recipient's visit address."
      >
        <Field
          name="billingAddressLine1"
          label="Address line 1"
          defaultValue={family.billingAddressLine1 ?? ''}
          error={state.errors?.billingAddressLine1}
        />
        <Field
          name="billingAddressLine2"
          label="Address line 2 (optional)"
          defaultValue={family.billingAddressLine2 ?? ''}
          error={state.errors?.billingAddressLine2}
        />
        <div className="grid gap-4 sm:grid-cols-[1.5fr_1fr]">
          <Field
            name="billingCity"
            label="Town/City"
            defaultValue={family.billingCity ?? ''}
            error={state.errors?.billingCity}
          />
          <Field
            name="billingPostcode"
            label="Postcode"
            defaultValue={family.billingPostcode ?? ''}
            error={state.errors?.billingPostcode}
          />
        </div>
        <Field
          name="billingCountry"
          label="Country (2-letter code)"
          defaultValue={family.billingCountry}
          error={state.errors?.billingCountry}
          hint="GB for United Kingdom. ISO 3166-1 alpha-2."
        />
      </Section>

      <div className="flex flex-wrap gap-3">
        <SubmitButton />
        <a
          href={`/ops/families/${family.id}`}
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
      {pending ? 'Saving…' : 'Save changes'}
    </button>
  );
}
