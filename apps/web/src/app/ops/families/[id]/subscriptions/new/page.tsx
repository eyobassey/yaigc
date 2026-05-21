import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { CreateForm } from './CreateForm';

export const metadata = { title: 'Create subscription' };

export default async function CreateSubscriptionPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { match?: string };
}) {
  const family = await prisma.family.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      billingName: true,
      recipients: { select: { id: true, firstName: true, lastName: true } },
    },
  });
  if (!family) notFound();
  if (family.recipients.length === 0) {
    redirect(`/ops/families/${family.id}`);
  }

  // When a matchId is passed in the query string we lock the form to the
  // people from that match — the operator just picks schedule + rate.
  const match = searchParams.match
    ? await prisma.match.findUnique({
        where: { id: searchParams.match },
        include: {
          companion: {
            select: { id: true, firstName: true, lastName: true, hourlyRate: true },
          },
          recipient: { select: { id: true, firstName: true, lastName: true } },
        },
      })
    : null;

  // Sanity check the inbound match: must belong to this family, must be
  // accepted, and must not already have a subscription.
  if (match) {
    const alreadyHasSub = await prisma.subscription.findUnique({
      where: { originatingMatchId: match.id },
    });
    if (match.familyId !== family.id || match.status !== 'accepted' || alreadyHasSub) {
      redirect(`/ops/matches/${match.id}`);
    }
  }

  const companions = match
    ? null
    : await prisma.companion.findMany({
        where: { status: { in: ['onboarding', 'active'] }, deletedAt: null },
        orderBy: [{ status: 'asc' }, { firstName: 'asc' }],
        select: { id: true, firstName: true, lastName: true, borough: true, hourlyRate: true },
      });

  return (
    <div className="max-w-[720px]">
      <Link
        href={match ? `/ops/matches/${match.id}` : `/ops/families/${family.id}`}
        className="inline-flex items-center gap-1 text-stone hover:text-moss text-sm mb-4 transition-colors"
      >
        <ChevronLeft size={14} strokeWidth={1.75} aria-hidden="true" />
        {match ? 'Back to match' : 'Back to family'}
      </Link>
      <header className="mb-8">
        <span className="font-body text-[0.75rem] font-medium uppercase tracking-[0.12em] text-stone mb-2 inline-block">
          Create subscription
        </span>
        <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1] break-words">
          {family.billingName}
        </h1>
        <p className="text-stone text-[0.9375rem] leading-[1.55] mt-2">
          Set the recurring schedule the family is paying for. Visits get
          generated from this once the booking engine lands.
        </p>
      </header>

      <CreateForm
        familyId={family.id}
        recipients={family.recipients}
        match={
          match
            ? {
                id: match.id,
                recipientId: match.recipientId ?? family.recipients[0]?.id ?? '',
                companion: {
                  id: match.companion.id,
                  label: `${match.companion.firstName} ${match.companion.lastName}`,
                  hourlyRate: Number(match.companion.hourlyRate).toFixed(2),
                },
              }
            : null
        }
        companions={
          companions
            ? companions.map((c) => ({
                id: c.id,
                label: `${c.firstName} ${c.lastName} (${c.borough.replace('_', ' ')})`,
                hourlyRate: Number(c.hourlyRate).toFixed(2),
              }))
            : null
        }
      />
    </div>
  );
}
