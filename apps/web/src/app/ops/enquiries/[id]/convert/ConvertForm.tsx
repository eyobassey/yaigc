'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { convertEnquiryToFamily, type ConvertEnquiryState } from '@/lib/family';

const initialState: ConvertEnquiryState = { ok: false };

const RELATIONSHIPS = [
  { value: 'daughter', label: 'Daughter' },
  { value: 'son', label: 'Son' },
  { value: 'partner', label: 'Partner' },
  { value: 'spouse', label: 'Spouse' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'grandchild', label: 'Grandchild' },
  { value: 'other', label: 'Other' },
] as const;

export function ConvertForm({
  enquiryId,
  defaults,
}: {
  enquiryId: string;
  defaults: {
    billingName: string;
    payerFirstName: string;
    payerLastName: string;
  };
}) {
  const [state, action] = useFormState(convertEnquiryToFamily, initialState);

  return (
    <form action={action} noValidate className="flex flex-col gap-7">
      <input type="hidden" name="enquiryId" value={enquiryId} />

      {state.errors?._form ? (
        <div className="bg-terracotta/10 border-l-4 border-terracotta px-4 py-3 rounded-r text-charcoal text-[0.9375rem]">
          {state.errors._form}
        </div>
      ) : null}

      <Section title="Family">
        <Field
          name="billingName"
          label="Billing name"
          hint="What appears on invoices. Usually the payer's full legal name."
          required
          defaultValue={state.values?.billingName ?? defaults.billingName}
          error={state.errors?.billingName}
        />
      </Section>

      <Section title="Payer">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            name="payerFirstName"
            label="First name"
            required
            defaultValue={state.values?.payerFirstName ?? defaults.payerFirstName}
            error={state.errors?.payerFirstName}
          />
          <Field
            name="payerLastName"
            label="Last name"
            required
            defaultValue={state.values?.payerLastName ?? defaults.payerLastName}
            error={state.errors?.payerLastName}
          />
        </div>
        <Select
          name="relationshipToRecipient"
          label="Relationship to the person being visited"
          required
          options={RELATIONSHIPS}
          defaultValue={state.values?.relationshipToRecipient ?? ''}
          error={state.errors?.relationshipToRecipient}
        />
      </Section>

      <Section title="Recipient">
        <p className="text-stone text-[0.875rem] leading-[1.55] -mt-2">
          The older adult who will receive the visits. More detail can be
          captured on the recipient profile after creation.
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            name="recipientFirstName"
            label="First name"
            required
            defaultValue={state.values?.recipientFirstName ?? ''}
            error={state.errors?.recipientFirstName}
          />
          <Field
            name="recipientLastName"
            label="Last name"
            required
            defaultValue={state.values?.recipientLastName ?? ''}
            error={state.errors?.recipientLastName}
          />
        </div>
        <Field
          name="recipientPreferredName"
          label="Preferred name (optional)"
          hint="What the companion should call them, if different from the first name."
          defaultValue={state.values?.recipientPreferredName ?? ''}
          error={state.errors?.recipientPreferredName}
        />
      </Section>

      <Section title="Intake notes (optional)">
        <Field
          name="intakeNotes"
          label="Anything worth carrying forward"
          as="textarea"
          rows={4}
          hint="Free-text notes from the intake call. Operator-visible."
          defaultValue={state.values?.intakeNotes ?? ''}
          error={state.errors?.intakeNotes}
        />
      </Section>

      <div className="flex flex-wrap gap-3 pt-2">
        <SubmitButton />
        <a
          href={`/ops/enquiries/${enquiryId}`}
          className="inline-flex items-center justify-center px-6 py-3 rounded-full border border-moss text-moss text-[0.9375rem] font-medium hover:bg-moss/5 transition-colors"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6 flex flex-col gap-4">
      <legend className="font-body text-[0.7rem] font-medium uppercase tracking-[0.1em] text-stone px-2 -ml-2">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function Field({
  name,
  label,
  as,
  type = 'text',
  required,
  defaultValue,
  error,
  hint,
  rows,
}: {
  name: string;
  label: string;
  as?: 'textarea';
  type?: string;
  required?: boolean;
  defaultValue?: string;
  error?: string;
  hint?: string;
  rows?: number;
}) {
  const id = `field-${name}`;
  const baseClasses =
    'bg-cream border rounded-lg px-3.5 py-2.5 text-charcoal text-[0.9375rem] placeholder:text-stone/60 focus:outline-none focus:ring-2 focus:ring-moss/20 transition-colors';
  const borderClass = error
    ? 'border-terracotta'
    : 'border-moss/15 focus:border-moss';

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="font-body text-[0.75rem] font-medium uppercase tracking-[0.08em] text-stone"
      >
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-1 text-terracotta">
            *
          </span>
        ) : null}
      </label>
      {as === 'textarea' ? (
        <textarea
          id={id}
          name={name}
          required={required}
          rows={rows}
          defaultValue={defaultValue}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={hint || error ? `${id}-hint` : undefined}
          className={`${baseClasses} ${borderClass} resize-y leading-[1.55]`}
        />
      ) : (
        <input
          id={id}
          name={name}
          type={type}
          required={required}
          defaultValue={defaultValue}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={hint || error ? `${id}-hint` : undefined}
          className={`${baseClasses} ${borderClass}`}
        />
      )}
      {error ? (
        <p id={`${id}-hint`} className="text-terracotta text-[0.8125rem]">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-stone text-[0.8125rem]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function Select({
  name,
  label,
  options,
  required,
  defaultValue,
  error,
}: {
  name: string;
  label: string;
  options: readonly { value: string; label: string }[];
  required?: boolean;
  defaultValue?: string;
  error?: string;
}) {
  const id = `field-${name}`;
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="font-body text-[0.75rem] font-medium uppercase tracking-[0.08em] text-stone"
      >
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-1 text-terracotta">
            *
          </span>
        ) : null}
      </label>
      <select
        id={id}
        name={name}
        required={required}
        defaultValue={defaultValue}
        aria-invalid={error ? 'true' : undefined}
        className={`bg-cream border rounded-lg px-3.5 py-2.5 text-charcoal text-[0.9375rem] focus:outline-none focus:ring-2 focus:ring-moss/20 transition-colors ${
          error ? 'border-terracotta' : 'border-moss/15 focus:border-moss'
        }`}
      >
        <option value="" disabled>
          Choose one
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error ? (
        <p className="text-terracotta text-[0.8125rem]">{error}</p>
      ) : null}
    </div>
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
      {pending ? 'Creating Family…' : 'Create Family + Recipient'}
    </button>
  );
}
