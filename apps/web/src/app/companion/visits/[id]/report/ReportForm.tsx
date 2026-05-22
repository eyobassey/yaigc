'use client';

import { useFormState, useFormStatus } from 'react-dom';
import {
  submitPostVisitReportByCompanion,
  type SubmitReportState,
} from '@/lib/post-visit-report';
import { Field, TextArea, Section } from '@/app/ops/_components/EditField';

const WELLBEING = [
  { value: 'cheerful', label: 'Cheerful and chatty', hint: 'Engaged, in good spirits.' },
  { value: 'quiet', label: 'Quiet but settled', hint: 'Less talkative than usual but content.' },
  { value: 'tired', label: 'Tired', hint: 'Visibly worn out; visit was shorter or gentler.' },
  { value: 'unwell', label: 'Not feeling their best', hint: 'Off-colour. Worth flagging.' },
  {
    value: 'distressed',
    label: 'Upset',
    hint: 'Worth flagging for the operator. Use the "Things to flag" box below.',
  },
  { value: 'other', label: 'Other', hint: 'Add a note below.' },
];

const initial: SubmitReportState = { ok: false };

export function ReportForm({
  visitId,
  defaultDurationMinutes,
  recipientName,
}: {
  visitId: string;
  defaultDurationMinutes: number;
  recipientName: string;
}) {
  const [state, action] = useFormState(submitPostVisitReportByCompanion, initial);

  return (
    <form action={action} noValidate className="flex flex-col gap-6">
      <input type="hidden" name="visitId" value={visitId} />

      {state.errors?._form ? (
        <div className="bg-terracotta/10 border-l-4 border-terracotta px-4 py-3 rounded-r text-charcoal text-[0.9375rem]">
          {state.errors._form}
        </div>
      ) : null}

      <Section title="How long the visit was">
        <Field
          name="actualDurationMinutes"
          label="Actual duration (minutes)"
          type="number"
          required
          defaultValue={
            state.values?.actualDurationMinutes ?? String(defaultDurationMinutes)
          }
          error={state.errors?.actualDurationMinutes}
          hint="Defaults to the scheduled duration. Adjust if it ran short or long."
        />
      </Section>

      <Section
        title="What happened"
        description={`In your own words. ${recipientName}'s family sees this verbatim.`}
      >
        <TextArea
          name="whatHappened"
          label="The visit"
          rows={6}
          required
          defaultValue={state.values?.whatHappened}
          error={state.errors?.whatHappened}
          hint="A short paragraph. What you talked about, what you did together, anything memorable."
        />
      </Section>

      <Section title="How were they">
        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">Wellbeing</legend>
          {WELLBEING.map((w) => (
            <label
              key={w.value}
              htmlFor={`wellbeing-${w.value}`}
              className="flex items-start gap-3 cursor-pointer text-charcoal text-[0.9375rem] leading-[1.4] p-3 rounded-md border border-moss/10 hover:border-moss/30 hover:bg-cream-deep/40 transition-colors has-[:checked]:border-moss has-[:checked]:bg-moss/5"
            >
              <input
                id={`wellbeing-${w.value}`}
                type="radio"
                name="howWereThey"
                value={w.value}
                defaultChecked={state.values?.howWereThey === w.value}
                required
                className="mt-0.5 w-4 h-4 text-moss focus:ring-moss/30 flex-shrink-0"
              />
              <span className="flex flex-col gap-0.5">
                <span className="font-medium">{w.label}</span>
                <span className="text-stone text-[0.8125rem]">{w.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <TextArea
          name="howWereTheyNote"
          label="A little more (optional)"
          rows={2}
          defaultValue={state.values?.howWereTheyNote}
          error={state.errors?.howWereTheyNote}
          hint="Goes to the family alongside your rating."
        />
      </Section>

      <Section
        title="Photos (optional)"
        description="Up to 4 JPEG or PNG photos, max 5MB each. Goes in the family email inline."
      >
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="photos"
            className="font-body text-[0.75rem] font-medium uppercase tracking-[0.08em] text-stone"
          >
            Photos
          </label>
          <input
            id="photos"
            type="file"
            name="photos"
            accept="image/jpeg,image/png"
            multiple
            className="text-charcoal text-[0.875rem] file:mr-3 file:rounded-md file:border file:border-moss/20 file:bg-cream file:px-3 file:py-1.5 file:text-[0.8125rem] file:text-moss hover:file:bg-moss hover:file:text-cream file:transition-colors file:cursor-pointer"
          />
          {state.errors?.photos ? (
            <p className="text-terracotta text-[0.8125rem]">{state.errors.photos}</p>
          ) : null}
        </div>
        <label
          htmlFor="recipientConsentForPhotos"
          className="flex items-start gap-3 cursor-pointer text-charcoal text-[0.9375rem] leading-[1.5]"
        >
          <input
            id="recipientConsentForPhotos"
            type="checkbox"
            name="recipientConsentForPhotos"
            className="mt-0.5 w-4 h-4 rounded border-moss/30 text-moss focus:ring-moss/30 flex-shrink-0"
          />
          <span className="flex flex-col gap-0.5">
            <span>
              {recipientName} consented to these photos being shared with the family.
            </span>
            <span className="text-stone text-[0.8125rem]">
              Required when at least one photo is attached. Ask on the
              day; if they hesitate, leave the photos out.
            </span>
          </span>
        </label>
        {state.errors?.recipientConsentForPhotos ? (
          <p className="text-terracotta text-[0.8125rem]">
            {state.errors.recipientConsentForPhotos}
          </p>
        ) : null}
      </Section>

      <Section
        title="Anything to flag for the operator"
        description="Only the operator sees this. The family does not. Anything you write here opens a safeguarding case for us to follow up on."
      >
        <TextArea
          name="thingsToFlag"
          label="For the operator's eyes only"
          rows={4}
          defaultValue={state.values?.thingsToFlag}
          error={state.errors?.thingsToFlag}
          hint="Leave blank if there is nothing. If you write here, an operator will pick it up today."
        />
      </Section>

      <div className="flex flex-wrap gap-3">
        <SubmitButton />
        <a
          href={`/companion/visits/${visitId}`}
          className="inline-flex items-center justify-center px-6 py-3 rounded-full border border-moss text-moss text-[0.9375rem] font-medium hover:bg-moss/5 transition-colors"
        >
          Back
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
      {pending ? 'Submitting…' : 'Submit your note'}
    </button>
  );
}
