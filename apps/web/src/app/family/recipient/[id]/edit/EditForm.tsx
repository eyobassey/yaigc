'use client';

import { useFormState, useFormStatus } from 'react-dom';
import {
  editFamilyRecipient,
  type EditRecipientState,
} from '@/lib/family-portal';
import {
  CANONICAL_INTERESTS,
  CANONICAL_MOBILITY,
  CANONICAL_DIETARY,
  parseTagged,
} from '@/lib/recipient-tags';
import { TagPicker } from '@/components/forms/TagPicker';
import {
  Field,
  TextArea,
  Section,
  Checkbox,
} from '@/app/ops/_components/EditField';

const initial: EditRecipientState = { ok: false };

export interface RecipientEditInput {
  id: string;
  firstName: string;
  lastName: string;
  preferredName: string | null;
  pronouns: string | null;
  phone: string | null;
  dateOfBirth: string | null;
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
  consentToVisits: boolean;
  consentToPhotos: boolean;
  consentToReportSharing: boolean;
}

export function EditForm({
  recipient,
  addressLocked,
}: {
  recipient: RecipientEditInput;
  addressLocked: boolean;
}) {
  const [state, action] = useFormState(editFamilyRecipient, initial);
  const v = (k: keyof RecipientEditInput): string | undefined => {
    const fromState = state.values?.[k as string];
    if (fromState !== undefined) return fromState;
    const original = recipient[k];
    if (typeof original === 'boolean') return undefined;
    return original ?? undefined;
  };

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

      <Section title="Who they are">
        <Field
          name="firstName"
          label="First name"
          required
          defaultValue={v('firstName')}
          error={state.errors?.firstName}
        />
        <Field
          name="lastName"
          label="Last name"
          required
          defaultValue={v('lastName')}
          error={state.errors?.lastName}
        />
        <Field
          name="preferredName"
          label="Known as (optional)"
          defaultValue={v('preferredName')}
          error={state.errors?.preferredName}
        />
        <Field
          name="pronouns"
          label="Pronouns (optional)"
          defaultValue={v('pronouns')}
          error={state.errors?.pronouns}
          hint="For example: she/her, he/him, they/them."
        />
        <Field
          name="dateOfBirth"
          label="Date of birth (optional)"
          type="date"
          defaultValue={v('dateOfBirth')}
          error={state.errors?.dateOfBirth}
        />
        <Field
          name="phone"
          label="Phone (optional)"
          type="tel"
          defaultValue={v('phone')}
          error={state.errors?.phone}
        />
      </Section>

      <Section
        title="Address"
        description={
          addressLocked
            ? 'Locked because of an active subscription. To change, call or email us and we will sort it on a quick call.'
            : 'Where the visits happen.'
        }
      >
        <Field
          name="addressLine1"
          label="Line 1"
          defaultValue={v('addressLine1')}
          error={state.errors?.addressLine1}
          autoComplete="address-line1"
        />
        <Field
          name="addressLine2"
          label="Line 2 (optional)"
          defaultValue={v('addressLine2')}
          error={state.errors?.addressLine2}
          autoComplete="address-line2"
        />
        <Field
          name="addressCity"
          label="City"
          defaultValue={v('addressCity')}
          error={state.errors?.addressCity}
          autoComplete="address-level2"
        />
        <Field
          name="addressPostcode"
          label="Postcode"
          defaultValue={v('addressPostcode')}
          error={state.errors?.addressPostcode}
          autoComplete="postal-code"
        />
        {addressLocked ? (
          <p className="text-stone text-[0.8125rem] -mt-2">
            Address values are read-only here; we will skip them on save.
          </p>
        ) : null}
      </Section>

      <Section
        title="Interests"
        description="Pick whatever sounds right; add anything else below. This helps the companion arrive with something to talk about."
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
          defaultValue={state.values?.interestsOther ?? interestsParsed.other}
          error={state.errors?.interestsOther}
          hint="Groups, programmes, songs, places, anything personal."
        />
      </Section>

      <Section
        title="Mobility"
        description="Helps the companion know what to expect on arrival and plan the visit."
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
          defaultValue={state.values?.mobilityOther ?? mobilityParsed.other}
          error={state.errors?.mobilityOther}
        />
      </Section>

      <Section
        title="Dietary"
        description="If you offer tea, biscuits or share a meal during the visit."
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
          defaultValue={state.values?.dietaryOther ?? dietaryParsed.other}
          error={state.errors?.dietaryOther}
        />
      </Section>

      <Section
        title="Other things to share with the companion"
        description="Free text for context that does not fit anywhere else."
      >
        <TextArea
          name="thingsToKnow"
          label="Things to know"
          rows={3}
          defaultValue={v('thingsToKnow')}
          error={state.errors?.thingsToKnow}
          hint="Anything helpful the companion should arrive knowing."
        />
        <TextArea
          name="healthNotes"
          label="Health notes (optional)"
          rows={3}
          defaultValue={v('healthNotes')}
          error={state.errors?.healthNotes}
          hint="Conditions to be aware of. We treat this carefully."
        />
        <TextArea
          name="religiousObservance"
          label="Religious observance (optional)"
          rows={2}
          defaultValue={v('religiousObservance')}
          error={state.errors?.religiousObservance}
        />
      </Section>

      <Section
        title="Consents"
        description="These flags shape what we share back to you and what the companion can do during the visit."
      >
        <Checkbox
          name="consentToVisits"
          label="Visits to this household are consented to"
          defaultChecked={recipient.consentToVisits}
        />
        <Checkbox
          name="consentToPhotos"
          label="Photos may be taken during a visit"
          hint="With the recipient's agreement on the day. Always optional."
          defaultChecked={recipient.consentToPhotos}
        />
        <Checkbox
          name="consentToReportSharing"
          label="Visit notes may be shared with the family"
          hint="Turn off and we keep notes internal only."
          defaultChecked={recipient.consentToReportSharing}
        />
        <Field
          name="consentEvidence"
          label="Optional: a note about who agreed and when"
          defaultValue={state.values?.consentEvidence}
          error={state.errors?.consentEvidence}
          hint="For our records. Example: 'Spoke with Margaret on 12 May, she said yes.'"
        />
      </Section>

      <div className="flex flex-wrap gap-3">
        <SubmitButton />
        <a
          href="/family/recipient"
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
