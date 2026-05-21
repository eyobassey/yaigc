'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { proposeMatch, type ProposeMatchState } from '@/lib/match';
import { Select, TextArea, Section } from '@/app/ops/_components/EditField';

const initial: ProposeMatchState = { ok: false };

export function ProposeForm({
  familyId,
  recipients,
  companions,
}: {
  familyId: string;
  recipients: {
    id: string;
    firstName: string;
    lastName: string;
    preferredName: string | null;
    addressCity: string | null;
  }[];
  companions: { id: string; label: string }[];
}) {
  const [state, action] = useFormState(proposeMatch, initial);

  const recipientOptions = recipients.map((r) => ({
    value: r.id,
    label: r.preferredName
      ? `${r.firstName} ${r.lastName} (known as ${r.preferredName})${r.addressCity ? ` · ${r.addressCity}` : ''}`
      : `${r.firstName} ${r.lastName}${r.addressCity ? ` · ${r.addressCity}` : ''}`,
  }));

  const companionOptions = companions.map((c) => ({ value: c.id, label: c.label }));

  return (
    <form action={action} noValidate className="flex flex-col gap-6">
      <input type="hidden" name="familyId" value={familyId} />

      {state.errors?._form ? (
        <div className="bg-terracotta/10 border-l-4 border-terracotta px-4 py-3 rounded-r text-charcoal text-[0.9375rem]">
          {state.errors._form}
        </div>
      ) : null}

      <Section title="Who is being visited">
        <Select
          name="recipientId"
          label="Recipient"
          required
          options={recipientOptions}
          defaultValue={
            state.values?.recipientId ??
            (recipients.length === 1 ? recipients[0]?.id : undefined)
          }
          error={state.errors?.recipientId}
        />
      </Section>

      <Section title="Who is doing the visiting">
        <Select
          name="candidateCompanionId"
          label="Companion"
          required
          options={companionOptions}
          defaultValue={state.values?.candidateCompanionId}
          error={state.errors?.candidateCompanionId}
        />
      </Section>

      <Section title="Rationale">
        <TextArea
          name="rationale"
          label="Why this companion for this recipient"
          required
          rows={5}
          defaultValue={state.values?.rationale}
          error={state.errors?.rationale}
          hint="Shared interests, geographic fit, schedule fit, anything we want a future operator to understand at a glance."
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
      {pending ? 'Proposing…' : 'Propose match'}
    </button>
  );
}
