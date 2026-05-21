import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ChevronLeft, AlertTriangle } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { EditForm } from './EditForm';

export const metadata = { title: 'Edit subscription' };

export default async function EditSubscriptionPage({
  params,
}: {
  params: { id: string };
}) {
  const sub = await prisma.subscription.findUnique({
    where: { id: params.id },
    include: {
      family: { select: { id: true, billingName: true } },
      _count: {
        select: {
          visits: { where: { state: { in: ['scheduled', 'confirmed'] } } },
        },
      },
    },
  });
  if (!sub) notFound();
  if (sub.status !== 'active' && sub.status !== 'paused') {
    redirect(`/ops/subscriptions/${sub.id}`);
  }

  const futureCount = sub._count.visits;

  return (
    <div className="max-w-[720px]">
      <Link
        href={`/ops/subscriptions/${sub.id}`}
        className="inline-flex items-center gap-1 text-stone hover:text-moss text-sm mb-4 transition-colors"
      >
        <ChevronLeft size={14} strokeWidth={1.75} aria-hidden="true" />
        Back to subscription
      </Link>
      <header className="mb-8">
        <span className="font-body text-[0.75rem] font-medium uppercase tracking-[0.12em] text-stone mb-2 inline-block">
          Edit recurring schedule
        </span>
        <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1] break-words">
          {sub.family.billingName}
        </h1>
      </header>

      {futureCount > 0 ? (
        <div className="mb-6 bg-amber-50 border-l-4 border-amber-400 px-5 py-4 rounded-r">
          <p className="font-body text-[0.7rem] font-medium uppercase tracking-[0.12em] text-amber-700 mb-1 flex items-center gap-2">
            <AlertTriangle size={14} strokeWidth={2} aria-hidden="true" />
            {futureCount} future visit{futureCount === 1 ? '' : 's'} on the old schedule
          </p>
          <p className="text-charcoal text-[0.9375rem] leading-[1.55]">
            Existing scheduled visits keep their old date and time. To re-time them, open each one and use Edit, or cancel them and use "Generate next visit". The next freshly generated visit will follow the new pattern.
          </p>
        </div>
      ) : null}

      <EditForm
        subscriptionId={sub.id}
        defaultFrequency={sub.frequency}
        defaultDayOfWeek={sub.dayOfWeek}
        defaultStartTime={sub.startTime}
        defaultDurationMinutes={sub.durationMinutes}
        defaultHourlyRate={Number(sub.hourlyRate).toFixed(2)}
        defaultNotes={sub.notes}
      />
    </div>
  );
}
