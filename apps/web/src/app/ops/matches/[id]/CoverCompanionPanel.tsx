'use client';

import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { assignCoverCompanion } from '@/lib/match';

// SDD Addendum S.4. Always-on cover-companion picker on the match
// detail aside. Acceptance does not wait on cover, so this panel is
// the operator's surface for closing the gap when a cover becomes
// available, or for swapping/clearing the cover later.

type Option = { value: string; label: string };

type Cover = {
  id: string;
  applicationId: string;
  firstName: string;
  lastName: string;
  borough: string;
} | null;

export function CoverCompanionPanel({
  matchId,
  cover,
  eligible,
}: {
  matchId: string;
  cover: Cover;
  eligible: Option[];
}) {
  return (
    <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
      <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-2">
        Cover companion
      </h2>
      {cover ? (
        <div className="mb-3">
          <Link
            href={`/ops/companions/${cover.applicationId}`}
            className="font-head text-moss text-[1.0625rem] font-medium hover:text-terracotta inline-flex items-center gap-1"
          >
            {cover.firstName} {cover.lastName}
            <ChevronRight size={14} strokeWidth={1.75} aria-hidden="true" />
          </Link>
          <div className="text-stone text-[0.8125rem] mt-0.5">
            {cover.borough.replace(/_/g, ' ')}
          </div>
        </div>
      ) : (
        <p className="text-stone text-[0.8125rem] italic mb-3">
          Not yet named. You can leave this blank; visits start either way.
        </p>
      )}

      <form action={assignCoverCompanion} className="flex flex-col gap-2">
        <input type="hidden" name="matchId" value={matchId} />
        <label htmlFor={`cover-${matchId}`} className="sr-only">
          {cover ? 'Change cover companion' : 'Assign cover companion'}
        </label>
        <select
          id={`cover-${matchId}`}
          name="coverCompanionId"
          defaultValue={cover?.id ?? ''}
          className="w-full px-3 py-2 rounded-md border border-moss/15 bg-cream text-charcoal text-[0.875rem] focus:outline-none focus:ring-2 focus:ring-moss/30"
        >
          <option value="">Not yet named</option>
          {eligible.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <SubmitButton hasCover={Boolean(cover)} />
      </form>
    </section>
  );
}

function SubmitButton({ hasCover }: { hasCover: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-moss text-cream text-[0.8125rem] font-medium hover:bg-moss-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? 'Saving…' : hasCover ? 'Update cover' : 'Assign cover'}
    </button>
  );
}
