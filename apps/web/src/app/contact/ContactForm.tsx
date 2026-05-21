'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { submitContactForm, type ContactFormState } from '@/lib/enquiry';
import { Button } from '@/components/ui/Button';

const initialState: ContactFormState = { ok: false };

export function ContactForm() {
  const [state, action] = useFormState(submitContactForm, initialState);

  return (
    <form
      action={action}
      noValidate
      className="bg-paper border border-moss/[0.08] rounded-[20px] p-[clamp(1.75rem,3vw,2.5rem)] flex flex-col gap-5"
    >
      <Field
        name="name"
        label="Your name"
        required
        autoComplete="name"
        defaultValue={state.values?.name}
        error={state.errors?.name}
      />
      <Field
        name="email"
        type="email"
        label="Email"
        required
        autoComplete="email"
        defaultValue={state.values?.email}
        error={state.errors?.email}
      />
      <div className="grid gap-5 min-[500px]:grid-cols-2">
        <Field
          name="phone"
          type="tel"
          label="Phone (optional)"
          autoComplete="tel"
          defaultValue={state.values?.phone}
          error={state.errors?.phone}
        />
        <Field
          name="postcode"
          label="Postcode (optional)"
          autoComplete="postal-code"
          defaultValue={state.values?.postcode}
          error={state.errors?.postcode}
          hint="Helps us check we are in your area"
        />
      </div>
      <Field
        name="message"
        label="Tell us about your mum or dad"
        as="textarea"
        rows={6}
        required
        defaultValue={state.values?.message}
        error={state.errors?.message}
        hint="Where they live, what they enjoy, what a good visit would look like"
      />

      <label className="flex items-start gap-3 text-charcoal text-[0.9375rem] leading-[1.55] cursor-pointer">
        <input
          type="checkbox"
          name="consentMarketing"
          className="mt-1 w-4 h-4 rounded border-moss/30 text-moss focus:ring-moss/30"
        />
        <span>
          Send me occasional thoughtful emails about how we work. No spam,
          unsubscribe any time.
        </span>
      </label>

      <SubmitButton />

      <p className="text-stone text-[0.8125rem] leading-[1.55]">
        By submitting this form, you agree to our{' '}
        <a href="/privacy" className="link">
          privacy notice
        </a>
        . We will use your details to call you back about this enquiry and
        for no other purpose, unless you tick the box above.
      </p>
    </form>
  );
}

function Field({
  name,
  label,
  as,
  type = 'text',
  required,
  autoComplete,
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
  autoComplete?: string;
  defaultValue?: string;
  error?: string;
  hint?: string;
  rows?: number;
}) {
  const id = `field-${name}`;
  const baseClasses =
    'bg-cream border rounded-lg px-4 py-3 text-charcoal text-[1rem] placeholder:text-stone/60 focus:outline-none focus:ring-2 focus:ring-moss/20 transition-colors';
  const borderClass = error ? 'border-terracotta' : 'border-moss/15 focus:border-moss';

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-body text-sm font-medium text-stone uppercase tracking-[0.08em]">
        {label}
        {required ? <span aria-hidden="true" className="ml-1 text-terracotta">*</span> : null}
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
          autoComplete={autoComplete}
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

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="self-start">
      {pending ? 'Sending…' : 'Send'}
    </Button>
  );
}
