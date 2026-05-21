import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ChevronLeft, AlertTriangle } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { summariseSubscription } from '@/lib/subscription-format';
import { EndForm } from './EndForm';

export const metadata = { title: 'End match' };

export default async function EndMatchPage({
  params,
}: {
  params: { id: string };
}) {
  const match = await prisma.match.findUnique({
    where: { id: params.id },
    include: {
      family: { select: { id: true, billingName: true } },
      recipient: { select: { firstName: true, lastName: true, preferredName: true } },
      companion: { select: { firstName: true, lastName: true } },
      subscription: {
        select: {
          id: true,
          status: true,
          frequency: true,
          dayOfWeek: true,
          startTime: true,
          durationMinutes: true,
          hourlyRate: true,
        },
      },
    },
  });
  if (!match) notFound();
  if (match.status !== 'accepted') {
    redirect(`/ops/matches/${match.id}`);
  }

  const cascadeSub =
    match.subscription && match.subscription.status !== 'canceled'
      ? match.subscription
      : null;

  return (
    <div className="max-w-[720px]">
      <Link
        href={`/ops/matches/${match.id}`}
        className="inline-flex items-center gap-1 text-stone hover:text-moss text-sm mb-4 transition-colors"
      >
        <ChevronLeft size={14} strokeWidth={1.75} aria-hidden="true" />
        Back to match
      </Link>
      <header className="mb-8">
        <span className="font-body text-[0.75rem] font-medium uppercase tracking-[0.12em] text-stone mb-2 inline-block">
          End match
        </span>
        <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1] break-words">
          {match.family.billingName}
          <span className="text-stone font-body font-normal mx-2 text-[1.25rem]">·</span>
          {match.companion.firstName} {match.companion.lastName}
        </h1>
        <p className="text-stone text-[0.9375rem] leading-[1.55] mt-2">
          Use this when a confirmed pairing has to be separated. The
          family and the companion both get an email; the operator note
          stays internal.
        </p>
      </header>

      {cascadeSub ? (
        <div className="mb-6 bg-amber-50 border-l-4 border-amber-400 px-5 py-4 rounded-r">
          <p className="font-body text-[0.7rem] font-medium uppercase tracking-[0.12em] text-amber-700 mb-1 flex items-center gap-2">
            <AlertTriangle size={14} strokeWidth={2} aria-hidden="true" />
            This will cancel the active subscription
          </p>
          <p className="text-charcoal text-[0.9375rem] leading-[1.55]">
            {summariseSubscription(cascadeSub)}
          </p>
          <p className="text-charcoal text-[0.875rem] leading-[1.55] mt-2">
            Future visits stop. Completed visits stay on file. The
            cancellation reason on the subscription is set to "Match
            ended: [your selected reason]".
          </p>
        </div>
      ) : null}

      <EndForm matchId={match.id} />
    </div>
  );
}
