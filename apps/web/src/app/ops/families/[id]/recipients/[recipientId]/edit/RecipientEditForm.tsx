'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { updateRecipient, type RecipientEditState } from '@/lib/family-edit';
import {
  CANONICAL_INTERESTS,
  CANONICAL_MOBILITY,
  CANONICAL_DIETARY,
  parseTagged,
} from '@/lib/recipient-tags';
import { TagPicker } from '@/components/forms/TagPicker';
import { Field, TextArea, Section, Checkbox } from '@/app/ops/_components/EditField';

const initial: RecipientEditState = { ok: false };

function dateValue(d: Date | null) {
  if (!d) return '';
  return d.toISOString().slice(0, 10);
}

export function RecipientEditForm({
  recipient,
  familyId,
}: {
  familyId: string;
  recipient: {
    id: string;
    firstName: string;
    lastName: string;
    preferredName: string | null;
    dateOfBirth: Date | null;
    phone: string | null;
    pronouns: string | null;
    interests: string | null;
    thingsToKnow: string | null;
    mobility: string | null;
    healthNotes: string | null;
    dietary: string | null;
    religiousObservance: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    addressCity: string | null;
    addressPostcode: string | null;
    addressCountry: string;
    consentToVisits: boolean;
    consentToPhotos: boolean;
    consentToReportSharing: boolean;
  };
}) {
  const [state, action] = useFormState(updateRecipient, initial);

  const interestsParsed = parseTagged(CANONICAL_INTERESTS, recipient.interests);
  const mobilityParsed = parseTagged(CANONICAL_MOBILITY, recipient.mobility);
  const dietaryParsed = parseTagged(CANONICAL_DIETARY, recipient.dietary);

  return (
    <form action={action} noValidate className="flex flex-col gap-6">
      <input type="hidden" name="recipientId" value={recipient.id} />

      {state.errors?._form ? (
        <div className="bg-terracotta/10 border-l-4 border-terracotta px-4 py-3 rounded-r text-charcoal text-[0.9375rem]">
          {state.errors._form}
        </div>
      ) : null}

      <Section title="Basics">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            name="firstName"
            label="First name"
            required
            defaultValue={recipient.firstName}
            error={state.errors?.firstName}
          />
          <Field
            name="lastName"
            label="Last name"
            required
            defaultValue={recipient.lastName}
            error={state.errors?.lastName}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            name="preferredName"
            label="Preferred name (optional)"
            defaultValue={recipient.preferredName ?? ''}
            hint="What the companion should call them."
            error={state.errors?.preferredName}
          />
          <Field
            name="dateOfBirth"
            type="date"
            label="Date of birth (optional)"
            defaultValue={dateValue(recipient.dateOfBirth)}
            error={state.errors?.dateOfBirth}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            name="phone"
            type="tel"
            label="Phone (optional)"
            defaultValue={recipient.phone ?? ''}
            error={state.errors?.phone}
          />
          <Field
            name="pronouns"
            label="Pronouns (optional)"
            defaultValue={recipient.pronouns ?? ''}
            error={state.errors?.pronouns}
          />
        </div>
      </Section>

      <Section
        title="Visit address"
        description="Where the visits happen. Visible only to the assigned companion and operators."
      >
        <Field
          name="addressLine1"
          label="Address line 1"
          defaultValue={recipient.addressLine1 ?? ''}
          error={state.errors?.addressLine1}
        />
        <Field
          name="addressLine2"
          label="Address line 2 (optional)"
          defaultValue={recipient.addressLine2 ?? ''}
          error={state.errors?.addressLine2}
        />
        <div className="grid gap-4 sm:grid-cols-[1.5fr_1fr]">
          <Field
            name="addressCity"
            label="Town/City"
            defaultValue={recipient.addressCity ?? ''}
            error={state.errors?.addressCity}
          />
          <Field
            name="addressPostcode"
            label="Postcode"
            defaultValue={recipient.addressPostcode ?? ''}
            error={state.errors?.addressPostcode}
          />
        </div>
        <Field
          name="addressCountry"
          label="Country (2-letter code)"
          defaultValue={recipient.addressCountry}
          hint="GB for United Kingdom. ISO 3166-1 alpha-2."
          error={state.errors?.addressCountry}
        />
      </Section>

      <Section
        title="Interests"
        description="Pick from common ones, add anything else below. Helps the companion arrive with something to talk about."
      >
        <TagPicker
          fieldPrefix="interest"
          canonical={CANONICAL_INTERESTS}
          selected={interestsParsed.selectedTags}
        />
        <TextArea
          name="interestsOther"
          label="Anything else"
          rows={2}
          defaultValue={interestsParsed.other}
          error={state.errors?.interestsOther}
          hint="Specific groups, programmes, places, anything personal."
        />
        <TextArea
          name="thingsToKnow"
          label="Things to know"
          defaultValue={recipient.thingsToKnow ?? ''}
          rows={3}
          hint='Practical context. "Hearing aid in left ear", "Likes tea on arrival".'
          error={state.errors?.thingsToKnow}
        />
      </Section>

      <Section
        title="Mobility (sensitive)"
        description="Restricted-visibility. Helps the companion know what to expect on arrival."
      >
        <TagPicker
          fieldPrefix="mobility"
          canonical={CANONICAL_MOBILITY}
          selected={mobilityParsed.selectedTags}
        />
        <TextArea
          name="mobilityOther"
          label="Anything else"
          rows={2}
          defaultValue={mobilityParsed.other}
          error={state.errors?.mobilityOther}
        />
      </Section>

      <Section
        title="Dietary (sensitive)"
        description="If you offer tea or share a meal during the visit."
      >
        <TagPicker
          fieldPrefix="dietary"
          canonical={CANONICAL_DIETARY}
          selected={dietaryParsed.selectedTags}
        />
        <TextArea
          name="dietaryOther"
          label="Anything else"
          rows={2}
          defaultValue={dietaryParsed.other}
          error={state.errors?.dietaryOther}
        />
      </Section>

      <Section
        title="Other (sensitive)"
        description="Restricted-visibility free-text fields. No clinical detail."
      >
        <TextArea
          name="healthNotes"
          label="Health notes (general)"
          defaultValue={recipient.healthNotes ?? ''}
          rows={3}
          hint="General context. Not a medical record."
          error={state.errors?.healthNotes}
        />
        <TextArea
          name="religiousObservance"
          label="Religious observance"
          defaultValue={recipient.religiousObservance ?? ''}
          rows={2}
          hint="If relevant to visit planning."
          error={state.errors?.religiousObservance}
        />
      </Section>

      <Section
        title="Consents"
        description="GDPR record of what the recipient has agreed to. Every change is logged with the operator who made it, the timestamp, and the evidence note below."
      >
        <Checkbox
          name="consentToVisits"
          label="Consent to visits"
          defaultChecked={recipient.consentToVisits}
          hint="Required before any companion visits start."
        />
        <Checkbox
          name="consentToPhotos"
          label="Consent to photos in post-visit reports"
          defaultChecked={recipient.consentToPhotos}
          hint="Captured separately. Often at the first visit, not at intake."
        />
        <Checkbox
          name="consentToReportSharing"
          label="Consent to family payer seeing post-visit reports"
          defaultChecked={recipient.consentToReportSharing}
          hint="Default on. Revocable. If revoked, the family payer no longer receives post-visit reports."
        />
        <TextArea
          name="consentEvidence"
          label="Evidence note (for any consent changes)"
          rows={2}
          hint='How was consent captured? "Verbal during 2026-05-21 intake call. Recorded." or "Signed form on file."'
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
      {pending ? 'Saving…' : 'Save changes'}
    </button>
  );
}
