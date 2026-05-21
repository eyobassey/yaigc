'use client';

import { useFormState, useFormStatus } from 'react-dom';
import {
  submitCompanionApplication,
  type ApplicationState,
} from '@/lib/companion';

const initial: ApplicationState = { ok: false };

export function ApplyForm() {
  const [state, action] = useFormState(submitCompanionApplication, initial);

  return (
    <form
      action={action}
      noValidate
      className="bg-paper border border-moss/[0.08] rounded-[20px] p-[clamp(1.75rem,3vw,2.5rem)] flex flex-col gap-7"
    >
      <Section title="About you">
        <div className="grid gap-5 sm:grid-cols-2">
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
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            name="email"
            type="email"
            label="Email"
            required
            autoComplete="email"
            defaultValue={state.values?.email}
            error={state.errors?.email}
          />
          <Field
            name="phone"
            type="tel"
            label="Phone"
            required
            autoComplete="tel"
            defaultValue={state.values?.phone}
            error={state.errors?.phone}
          />
        </div>
        <Field
          name="postcode"
          label="Home postcode"
          required
          autoComplete="postal-code"
          defaultValue={state.values?.postcode}
          error={state.errors?.postcode}
          hint="We look for South Manchester, Trafford, Stockport, Salford."
        />
      </Section>

      <Section title="When you are free">
        <TextArea
          name="availabilitySummary"
          label="Availability"
          required
          rows={3}
          defaultValue={state.values?.availabilitySummary}
          error={state.errors?.availabilitySummary}
          hint='A short summary. "Tuesday and Thursday mornings, Saturdays" is plenty.'
        />
      </Section>

      <Section title="A bit about you">
        <TextArea
          name="aboutYou"
          label="Tell us about yourself"
          required
          rows={5}
          defaultValue={state.values?.aboutYou}
          error={state.errors?.aboutYou}
          hint="What you do or have done, what you enjoy, the kind of person you are. A few sentences."
        />
        <TextArea
          name="whyJoinReason"
          label="Why you want to do this"
          required
          rows={4}
          defaultValue={state.values?.whyJoinReason}
          error={state.errors?.whyJoinReason}
          hint="What drew you to companionship visits specifically?"
        />
      </Section>

      <Section title="Confirmations">
        <Checkbox
          name="rightToWork"
          label="I have the right to work in the UK."
          required
          error={state.errors?.rightToWork}
        />
        <Checkbox
          name="backgroundCheckConsent"
          label="I consent to an Enhanced DBS check if my application progresses."
          required
          error={state.errors?.backgroundCheckConsent}
          hint="We will not run the check without telling you first."
        />
      </Section>

      <SubmitButton />

      <p className="text-stone text-[0.8125rem] leading-[1.55]">
        By submitting this form, you agree to our{' '}
        <a href="/privacy" className="link">
          privacy notice
        </a>
        . We use your details to consider your application and, if it
        progresses, to run vetting checks. We will respond either way.
      </p>
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
    <fieldset className="flex flex-col gap-4">
      <legend className="font-body text-[0.7rem] font-medium uppercase tracking-[0.1em] text-stone">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function Field({
  name,
  label,
  type = 'text',
  required,
  autoComplete,
  defaultValue,
  error,
  hint,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  defaultValue?: string;
  error?: string;
  hint?: string;
}) {
  const id = `field-${name}`;
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="font-body text-sm font-medium text-stone uppercase tracking-[0.08em]"
      >
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-1 text-terracotta">
            *
          </span>
        ) : null}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        aria-invalid={error ? 'true' : undefined}
        className={`bg-cream border rounded-lg px-4 py-3 text-charcoal text-base placeholder:text-stone/60 focus:outline-none focus:ring-2 focus:ring-moss/20 transition-colors ${
          error ? 'border-terracotta' : 'border-moss/15 focus:border-moss'
        }`}
      />
      {error ? (
        <p className="text-terracotta text-[0.8125rem]">{error}</p>
      ) : hint ? (
        <p className="text-stone text-[0.8125rem]">{hint}</p>
      ) : null}
    </div>
  );
}

function TextArea({
  name,
  label,
  required,
  rows = 4,
  defaultValue,
  error,
  hint,
}: {
  name: string;
  label: string;
  required?: boolean;
  rows?: number;
  defaultValue?: string;
  error?: string;
  hint?: string;
}) {
  const id = `field-${name}`;
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="font-body text-sm font-medium text-stone uppercase tracking-[0.08em]"
      >
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-1 text-terracotta">
            *
          </span>
        ) : null}
      </label>
      <textarea
        id={id}
        name={name}
        rows={rows}
        required={required}
        defaultValue={defaultValue}
        aria-invalid={error ? 'true' : undefined}
        className={`bg-cream border rounded-lg px-4 py-3 text-charcoal text-base placeholder:text-stone/60 focus:outline-none focus:ring-2 focus:ring-moss/20 transition-colors resize-y leading-[1.55] ${
          error ? 'border-terracotta' : 'border-moss/15 focus:border-moss'
        }`}
      />
      {error ? (
        <p className="text-terracotta text-[0.8125rem]">{error}</p>
      ) : hint ? (
        <p className="text-stone text-[0.8125rem]">{hint}</p>
      ) : null}
    </div>
  );
}

function Checkbox({
  name,
  label,
  required,
  error,
  hint,
}: {
  name: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
}) {
  const id = `field-${name}`;
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className="flex items-start gap-3 text-charcoal text-[0.9375rem] leading-[1.55] cursor-pointer"
      >
        <input
          id={id}
          type="checkbox"
          name={name}
          required={required}
          className="mt-1 w-4 h-4 rounded border-moss/30 text-moss focus:ring-moss/30 flex-shrink-0"
        />
        <span>
          {label}
          {required ? (
            <span aria-hidden="true" className="ml-1 text-terracotta">
              *
            </span>
          ) : null}
        </span>
      </label>
      {error ? (
        <p className="text-terracotta text-[0.8125rem] ml-7">{error}</p>
      ) : hint ? (
        <p className="text-stone text-[0.8125rem] ml-7">{hint}</p>
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
      className="inline-flex items-center justify-center px-9 py-[1.125rem] rounded-full bg-moss text-cream text-base font-medium hover:bg-moss-dark transition-all duration-200 hover:shadow-lg hover:-translate-y-px disabled:opacity-60 disabled:cursor-not-allowed self-start"
    >
      {pending ? 'Sending…' : 'Submit application'}
    </button>
  );
}
