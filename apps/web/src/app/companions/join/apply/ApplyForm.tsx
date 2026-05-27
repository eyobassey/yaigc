'use client';

import { useFormState, useFormStatus } from 'react-dom';
import {
  submitCompanionApplication,
  type ApplicationState,
} from '@/lib/companion';
import { DAYS, PERIODS } from '@/lib/availability';
import { Button } from '@/components/ui/Button';

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
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            name="postcode"
            label="Home postcode"
            required
            autoComplete="postal-code"
            defaultValue={state.values?.postcode}
            error={state.errors?.postcode}
            hint="We look for South Manchester, Trafford, Stockport, Salford."
          />
          <Field
            name="dateOfBirth"
            type="date"
            label="Date of birth"
            required
            autoComplete="bday"
            defaultValue={state.values?.dateOfBirth}
            error={state.errors?.dateOfBirth}
            hint="Required for the right-to-work check."
          />
        </div>
      </Section>

      <Section title="When you are free">
        <p className="text-stone text-[0.875rem] leading-[1.55] -mt-1">
          Pick every slot that usually works for you. Most companions tick
          two or three. You can change this any time.
        </p>

        {state.errors?.availability ? (
          <p className="text-terracotta text-[0.8125rem]">
            {state.errors.availability}
          </p>
        ) : null}

        <AvailabilityGrid />

        <TextArea
          name="availabilityCaveats"
          label="Anything else (optional)"
          rows={2}
          defaultValue={state.values?.availabilityCaveats}
          hint='Caveats, exceptions, school holidays. "Not bank holidays" or "Wednesday evenings only every other week" is fine.'
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

      <Section title="A few more open questions">
        <p className="text-stone text-[0.875rem] leading-[1.55] -mt-1">
          All optional. Skip any that do not have an answer ready. We will
          explore them together if you come in for an interview.
        </p>
        <TextArea
          name="motivation"
          label="What brings you to this work?"
          rows={4}
          defaultValue={state.values?.motivation}
          hint="Money is meaningful. We are also curious what else is in the mix."
        />
        <TextArea
          name="experienceAlongside"
          label="A time you were alongside someone"
          rows={5}
          defaultValue={state.values?.experienceAlongside}
          hint="A friend, family member, or neighbour who needed company. What did being alongside them look like for you?"
        />
        <TextArea
          name="yearsSettledLocally"
          label="How long have you been settled in this part of the UK?"
          rows={2}
          defaultValue={state.values?.yearsSettledLocally}
          hint="Settled life makes the weekly rhythm easier to hold. A rough sense is fine."
        />
        <TextArea
          name="weeklyStabilityNote"
          label="How stable does your week look over the next six months?"
          rows={3}
          defaultValue={state.values?.weeklyStabilityNote}
          hint="Holding the same visit time week after week matters for the relationship. Tell us anything we should know."
        />
      </Section>

      <Section title="Right to work in the UK">
        <p className="text-stone text-[0.875rem] leading-[1.55] -mt-1">
          UK law requires us to check this before you can take on visits. We will run the check using the details and document you upload here.
        </p>
        <fieldset className="flex flex-col gap-2">
          <legend className="font-body text-sm font-medium text-stone uppercase tracking-[0.08em] mb-1">
            Which best matches you{' '}
            <span aria-hidden="true" className="text-terracotta">*</span>
          </legend>
          {[
            { value: 'british_irish_passport', label: 'British or Irish citizen (passport)' },
            { value: 'settled_status', label: 'Settled status (EU Settlement Scheme)' },
            { value: 'pre_settled_status', label: 'Pre-settled status (EU Settlement Scheme)' },
            { value: 'skilled_worker_visa', label: 'Skilled Worker visa' },
            { value: 'graduate_visa', label: 'Graduate visa' },
            { value: 'student_visa', label: 'Student visa (with right to work)' },
            { value: 'dependant_visa', label: 'Dependant visa' },
            { value: 'indefinite_leave_to_remain', label: 'Indefinite Leave to Remain' },
            { value: 'other', label: 'Other (tell us in the box below)' },
          ].map((opt) => (
            <label
              key={opt.value}
              htmlFor={`rtw-${opt.value}`}
              className="flex items-start gap-3 cursor-pointer text-charcoal text-[0.9375rem] leading-[1.4] p-3 rounded-md border border-moss/10 hover:border-moss/30 hover:bg-cream-deep/40 transition-colors has-[:checked]:border-moss has-[:checked]:bg-moss/5"
            >
              <input
                id={`rtw-${opt.value}`}
                type="radio"
                name="rightToWorkType"
                value={opt.value}
                defaultChecked={state.values?.rightToWorkType === opt.value}
                required
                className="mt-0.5 w-4 h-4 text-moss focus:ring-moss/30 flex-shrink-0"
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </fieldset>
        {state.errors?.rightToWorkType ? (
          <p className="text-terracotta text-[0.8125rem]">{state.errors.rightToWorkType}</p>
        ) : null}

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            name="rightToWorkShareCode"
            label="Share code (if you have one)"
            defaultValue={state.values?.rightToWorkShareCode}
            error={state.errors?.rightToWorkShareCode}
            hint="9 characters, from gov.uk/prove-right-to-work."
          />
          <Field
            name="rightToWorkExpiresAt"
            type="date"
            label="Visa expiry (if applicable)"
            defaultValue={state.values?.rightToWorkExpiresAt}
            error={state.errors?.rightToWorkExpiresAt}
            hint="Skip if not on a time-limited visa."
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="rightToWorkDocs"
            className="font-body text-sm font-medium text-stone uppercase tracking-[0.08em]"
          >
            Upload supporting documents
          </label>
          <input
            id="rightToWorkDocs"
            type="file"
            name="rightToWorkDocs"
            accept="image/jpeg,image/png,application/pdf"
            multiple
            className="text-charcoal text-[0.9375rem] file:mr-3 file:rounded-md file:border file:border-moss/20 file:bg-cream file:px-3 file:py-2 file:text-[0.875rem] file:text-moss hover:file:bg-moss hover:file:text-cream file:transition-colors file:cursor-pointer"
          />
          <p className="text-stone text-[0.8125rem]">
            Passport scan, BRP, or the PDF from gov.uk/prove-right-to-work.
            JPEG, PNG or PDF up to 10MB each. You can also upload later.
          </p>
        </div>
      </Section>

      <Section title="Confirmations">
        <Checkbox
          name="rightToWork"
          label="I confirm I have the right to work in the UK."
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

function AvailabilityGrid() {
  return (
    <div className="bg-cream rounded-lg border border-moss/15 overflow-hidden">
      {/* Desktop: column header row. Hidden below sm because mobile uses
          per-day stacks where the period label sits next to each box. */}
      <div className="hidden sm:grid grid-cols-[max-content_repeat(3,1fr)] gap-x-3 px-4 py-3 border-b border-moss/10 bg-cream-deep">
        <span aria-hidden="true" />
        {PERIODS.map((p) => (
          <div key={p.key} className="text-charcoal">
            <div className="font-body text-[0.7rem] font-medium uppercase tracking-[0.08em] text-stone">
              {p.label}
            </div>
            <div className="text-stone text-[0.75rem]">{p.range}</div>
          </div>
        ))}
      </div>

      {/* One row per day. On sm+ this is a 4-column grid; below sm it
          stacks the day name above the three checkboxes. */}
      <ul className="divide-y divide-moss/10">
        {DAYS.map((d) => (
          <li
            key={d.key}
            className="grid grid-cols-3 sm:grid-cols-[max-content_repeat(3,1fr)] gap-x-3 gap-y-2 px-4 py-3"
          >
            <div className="col-span-3 sm:col-span-1 font-head text-moss text-[0.9375rem] font-medium">
              {d.label}
            </div>
            {PERIODS.map((p) => {
              const id = `slot-${d.key}-${p.key}`;
              return (
                <label
                  key={p.key}
                  htmlFor={id}
                  className="flex items-center gap-2 cursor-pointer text-charcoal text-[0.875rem]"
                >
                  <input
                    id={id}
                    type="checkbox"
                    name={`slot_${d.key}_${p.key}`}
                    className="w-4 h-4 rounded border-moss/30 text-moss focus:ring-moss/30 flex-shrink-0"
                  />
                  <span className="sm:hidden">{p.label}</span>
                  <span className="hidden sm:inline sr-only">
                    {d.label} {p.label}
                  </span>
                </label>
              );
            })}
          </li>
        ))}
      </ul>
    </div>
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
    <Button type="submit" disabled={pending} className="self-start">
      {pending ? 'Sending…' : 'Submit application'}
    </Button>
  );
}
