'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { updateFamilyMember, type FamilyMemberEditState } from '@/lib/family-edit';
import { Select, Section, Checkbox } from '@/app/ops/_components/EditField';

const initial: FamilyMemberEditState = { ok: false };

const RELATIONSHIPS = [
  { value: 'daughter', label: 'Daughter' },
  { value: 'son', label: 'Son' },
  { value: 'partner', label: 'Partner' },
  { value: 'spouse', label: 'Spouse' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'grandchild', label: 'Grandchild' },
  { value: 'other', label: 'Other' },
] as const;

export function MemberEditForm({
  member,
  familyId,
}: {
  member: {
    id: string;
    relationshipToRecipient: string | null;
    isPrimaryContact: boolean;
  };
  familyId: string;
}) {
  const [state, action] = useFormState(updateFamilyMember, initial);

  return (
    <form action={action} noValidate className="flex flex-col gap-6">
      <input type="hidden" name="memberId" value={member.id} />

      {state.errors?._form ? (
        <div className="bg-terracotta/10 border-l-4 border-terracotta px-4 py-3 rounded-r text-charcoal text-[0.9375rem]">
          {state.errors._form}
        </div>
      ) : null}

      <Section title="Member">
        <Select
          name="relationshipToRecipient"
          label="Relationship to the recipient"
          required
          options={RELATIONSHIPS}
          defaultValue={member.relationshipToRecipient ?? ''}
          error={state.errors?.relationshipToRecipient}
        />
        <Checkbox
          name="isPrimaryContact"
          label="Primary contact for this family"
          defaultChecked={member.isPrimaryContact}
          hint="The person we call. Only one member per family can be primary; promoting this one demotes the others."
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
