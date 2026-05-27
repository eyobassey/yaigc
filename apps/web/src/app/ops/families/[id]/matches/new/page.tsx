import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { previewCandidate, type CandidatePreview } from '@/lib/match-candidates';
import { ProposeForm } from './ProposeForm';

export const metadata = { title: 'Propose a match' };

// SDD Addendum §6.1 / Stage U.2. The propose page reads optional
// ?primary= and ?cover= query params (set by U.1's match-candidates
// list). When present, the corresponding companions get an
// enrichment preview rendered alongside the picker so the operator
// can compare the two side-by-side before submitting.

export default async function ProposeMatchPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const primaryId = pickString(searchParams.primary);
  const coverId = pickString(searchParams.cover);
  const presetRecipientId = pickString(searchParams.recipientId);

  const family = await prisma.family.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      billingName: true,
      billingPostcode: true,
      recipients: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          preferredName: true,
          addressCity: true,
          addressPostcode: true,
          interests: true,
        },
      },
    },
  });
  if (!family) notFound();

  // Show every onboarding+active companion. In v1 the operator picks
  // based on context (borough, availability, fit) so we do not filter
  // server-side — easier to scan all options in one place. Soft hard
  // filters land per-candidate via U.1's match-candidates page.
  const companions = await prisma.companion.findMany({
    where: { status: { in: ['onboarding', 'active'] }, deletedAt: null },
    orderBy: [{ status: 'asc' }, { firstName: 'asc' }, { lastName: 'asc' }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      borough: true,
      status: true,
      hourlyRate: true,
    },
  });

  // Pre-selected recipient context drives the preview enrichment.
  const effectiveRecipient =
    family.recipients.find((r) => r.id === presetRecipientId) ??
    family.recipients[0] ??
    null;
  const ctx = {
    recipientPostcode:
      effectiveRecipient?.addressPostcode ?? family.billingPostcode ?? null,
    recipientInterests: effectiveRecipient?.interests ?? null,
  };

  // Same id passed in both slots is a misuse; only one preview wins.
  const [primaryPreview, coverPreview] = await Promise.all([
    primaryId ? previewCandidate(primaryId, ctx) : Promise.resolve(null),
    coverId && coverId !== primaryId
      ? previewCandidate(coverId, ctx)
      : Promise.resolve(null),
  ]);

  return (
    <div className="max-w-[960px]">
      <Link
        href={`/ops/families/${family.id}`}
        className="inline-flex items-center gap-1 text-stone hover:text-moss text-sm mb-4 transition-colors"
      >
        <ChevronLeft size={14} strokeWidth={1.75} aria-hidden="true" />
        Back to family
      </Link>
      <header className="mb-8">
        <span className="font-body text-[0.75rem] font-medium uppercase tracking-[0.12em] text-stone mb-2 inline-block">
          Propose a match
        </span>
        <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1] break-words">
          {family.billingName}
        </h1>
        <p className="text-stone text-[0.9375rem] leading-[1.55] mt-2">
          Pick the recipient, pick the primary companion, optionally name a
          cover, write a one-paragraph rationale. The match opens at status
          proposed until both sides have confirmed on the phone.
        </p>
        {primaryPreview || coverPreview ? (
          <p className="text-stone text-[0.8125rem] mt-2">
            Primary{coverPreview ? ' + cover' : ''} pre-selected from the
            candidates page. You can change either picker below.
          </p>
        ) : (
          <p className="text-stone text-[0.8125rem] mt-2">
            <Link
              href={`/ops/families/${family.id}/match-candidates`}
              className="link"
            >
              Open the candidates list
            </Link>{' '}
            for a ranked view with travel times and interest overlap.
          </p>
        )}
      </header>

      {family.recipients.length === 0 ? (
        <div className="bg-terracotta/10 border-l-4 border-terracotta px-4 py-3 rounded-r">
          <p className="text-charcoal text-[0.9375rem]">
            This family has no recipients yet. Add a recipient before
            proposing a match.
          </p>
          <p className="mt-2">
            <Link href={`/ops/families/${family.id}/recipients/new`} className="link">
              Add a recipient
            </Link>
          </p>
        </div>
      ) : companions.length === 0 ? (
        <div className="bg-terracotta/10 border-l-4 border-terracotta px-4 py-3 rounded-r">
          <p className="text-charcoal text-[0.9375rem]">
            There are no active companions yet.{' '}
            <Link href="/ops/companions" className="link">
              See the companion pipeline
            </Link>
            .
          </p>
        </div>
      ) : (
        <ProposeForm
          familyId={family.id}
          recipients={family.recipients}
          companions={companions.map((c) => ({
            id: c.id,
            label: `${c.firstName} ${c.lastName} (${c.borough.replace('_', ' ')}, ${c.status}, £${Number(c.hourlyRate).toFixed(2)}/hr)`,
          }))}
          defaultRecipientId={presetRecipientId ?? null}
          defaultPrimaryId={primaryId ?? null}
          defaultCoverId={coverId && coverId !== primaryId ? coverId : null}
          primaryPreview={primaryPreview}
          coverPreview={coverPreview}
        />
      )}
    </div>
  );
}

function pickString(v: string | string[] | undefined): string | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

// Re-export for ProposeForm type-import convenience.
export type { CandidatePreview };
