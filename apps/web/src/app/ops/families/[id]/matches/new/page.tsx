import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { ProposeForm } from './ProposeForm';

export const metadata = { title: 'Propose a match' };

export default async function ProposeMatchPage({
  params,
}: {
  params: { id: string };
}) {
  const family = await prisma.family.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      billingName: true,
      recipients: {
        select: { id: true, firstName: true, lastName: true, preferredName: true, addressCity: true },
      },
    },
  });
  if (!family) notFound();

  // Show every onboarding+active companion. In v1 the operator picks
  // based on context (borough, availability, fit) so we do not filter
  // server-side — easier to scan all options in one place.
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

  return (
    <div className="max-w-[720px]">
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
          Pick the recipient, pick the companion, write a one-paragraph
          rationale. The match opens at status proposed until both sides
          have confirmed on the phone.
        </p>
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
        />
      )}
    </div>
  );
}
