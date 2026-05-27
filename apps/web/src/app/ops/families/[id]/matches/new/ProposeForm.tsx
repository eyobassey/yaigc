'use client';

import { useFormState, useFormStatus } from 'react-dom';
import Link from 'next/link';
import { MapPin, Heart, AlertTriangle, ChevronRight, Sparkles } from 'lucide-react';
import { proposeMatch, type ProposeMatchState } from '@/lib/match';
import {
  GATE_FAILURE_LABEL,
  type CandidatePreview,
  type GateFailure,
} from '@/lib/match-candidates';
import { companionPhotoSrc } from '@/lib/companion-photo-src';
import { Select, TextArea, Section } from '@/app/ops/_components/EditField';

const initial: ProposeMatchState = { ok: false };

export function ProposeForm({
  familyId,
  recipients,
  companions,
  defaultRecipientId,
  defaultPrimaryId,
  defaultCoverId,
  primaryPreview,
  coverPreview,
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
  defaultRecipientId: string | null;
  defaultPrimaryId: string | null;
  defaultCoverId: string | null;
  primaryPreview: CandidatePreview | null;
  coverPreview: CandidatePreview | null;
}) {
  const [state, action] = useFormState(proposeMatch, initial);

  const recipientOptions = recipients.map((r) => ({
    value: r.id,
    label: r.preferredName
      ? `${r.firstName} ${r.lastName} (known as ${r.preferredName})${r.addressCity ? ` · ${r.addressCity}` : ''}`
      : `${r.firstName} ${r.lastName}${r.addressCity ? ` · ${r.addressCity}` : ''}`,
  }));

  const companionOptions = companions.map((c) => ({ value: c.id, label: c.label }));

  const defaultRecipient =
    state.values?.recipientId ??
    defaultRecipientId ??
    (recipients.length === 1 ? recipients[0]?.id : undefined);
  const defaultPrimary = state.values?.candidateCompanionId ?? defaultPrimaryId ?? undefined;
  const defaultCover = state.values?.coverCompanionId ?? defaultCoverId ?? '';

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
          defaultValue={defaultRecipient}
          error={state.errors?.recipientId}
        />
      </Section>

      {primaryPreview || coverPreview ? (
        <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
          <h2 className="font-body text-[0.7rem] font-medium uppercase tracking-[0.1em] text-stone mb-4">
            Candidates side-by-side
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <CandidatePreviewCard role="Primary" preview={primaryPreview} />
            <CandidatePreviewCard role="Cover" preview={coverPreview} />
          </div>
        </section>
      ) : null}

      <Section title="Who is doing the visiting">
        <Select
          name="candidateCompanionId"
          label="Primary companion"
          required
          options={companionOptions}
          defaultValue={defaultPrimary}
          error={state.errors?.candidateCompanionId}
        />
      </Section>

      <Section
        title="Cover companion (optional)"
        description="A named back-up who shadows the primary on roughly one visit in five during the first two months, then steps in when the primary cannot. You can leave this blank and name a cover later."
      >
        <Select
          name="coverCompanionId"
          label="Cover companion"
          options={[{ value: '', label: 'Not yet named' }, ...companionOptions]}
          defaultValue={defaultCover}
          error={state.errors?.coverCompanionId}
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

function CandidatePreviewCard({
  role,
  preview,
}: {
  role: 'Primary' | 'Cover';
  preview: CandidatePreview | null;
}) {
  if (!preview) {
    return (
      <div className="rounded-md border border-dashed border-moss/15 px-4 py-6 text-center">
        <div className="font-body text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-stone mb-1">
          {role}
        </div>
        <p className="text-stone text-[0.8125rem] italic">
          {role === 'Cover'
            ? 'No cover pre-selected. Use the picker below to name one.'
            : 'No primary pre-selected. Use the picker below.'}
        </p>
      </div>
    );
  }
  const { companion, openMatchCount, travel, sharedInterests, gateFailures } = preview;
  const photo = companionPhotoSrc({
    id: companion.id,
    photoFilename: companion.photoFilename,
    photoUrl: companion.photoUrl,
  });
  return (
    <div className="rounded-md border border-moss/[0.12] bg-cream p-4">
      <div className="flex items-center gap-3 mb-3">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt=""
            width="56"
            height="56"
            className="w-14 h-14 rounded-full object-cover border border-moss/15"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-moss/10 flex items-center justify-center">
            <Heart size={20} strokeWidth={1.5} className="text-moss/40" aria-hidden="true" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="font-body text-[0.65rem] font-medium uppercase tracking-[0.08em] text-stone mb-0.5">
            {role}
          </div>
          <Link
            href={`/ops/companions/${companion.applicationId}`}
            className="font-head text-moss text-[1rem] font-medium hover:text-terracotta inline-flex items-center gap-1"
          >
            {companion.firstName} {companion.lastName}
            <ChevronRight size={12} strokeWidth={1.75} aria-hidden="true" />
          </Link>
        </div>
      </div>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-[0.8125rem] mb-3">
        <dt className="text-stone">Borough</dt>
        <dd className="text-charcoal inline-flex items-center gap-1">
          <MapPin size={12} strokeWidth={1.75} aria-hidden="true" />
          {companion.borough.replace(/_/g, ' ')}
        </dd>
        <dt className="text-stone">Rate</dt>
        <dd className="text-charcoal">£{Number(companion.hourlyRate).toFixed(2)}/hr</dd>
        <dt className="text-stone">Load</dt>
        <dd className="text-charcoal">
          {openMatchCount} of {companion.maxConcurrentMatches} matches
        </dd>
        {travel ? (
          <>
            <dt className="text-stone">Travel</dt>
            <dd className="text-charcoal">
              ~{travel.drivingMinutes} min ({travel.distanceMiles} mi)
            </dd>
          </>
        ) : null}
        <dt className="text-stone">DBS</dt>
        <dd className="text-charcoal">
          {companion.dbsRenewalDueAt
            ? `Clear until ${companion.dbsRenewalDueAt.toISOString().slice(0, 10)}`
            : 'Not on file'}
        </dd>
      </dl>
      {sharedInterests.length > 0 ? (
        <div className="flex items-center gap-1 text-[0.75rem] text-moss mb-2">
          <Sparkles size={11} strokeWidth={1.75} aria-hidden="true" />
          {sharedInterests.length} shared interest{sharedInterests.length === 1 ? '' : 's'}:{' '}
          {sharedInterests.join(', ')}
        </div>
      ) : null}
      {gateFailures.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {gateFailures.map((g) => (
            <li
              key={g}
              className="inline-flex items-center gap-1 text-terracotta text-[0.75rem]"
            >
              <AlertTriangle size={12} strokeWidth={1.75} aria-hidden="true" />
              {GATE_FAILURE_LABEL[g]}
            </li>
          ))}
        </ul>
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
      {pending ? 'Proposing…' : 'Propose match'}
    </button>
  );
}

// Re-export so external imports work cleanly without forcing
// /lib/match-candidates resolution.
export type { CandidatePreview, GateFailure };
