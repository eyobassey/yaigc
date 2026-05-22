import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ChevronLeft, FileText } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { requireCompanion } from '@/lib/auth-helpers';
import { formatUkDateTime } from '@/lib/visit-schedule';
import { ReportForm } from './ReportForm';

export const metadata = { title: 'Submit your note' };

export default async function CompanionVisitReportPage({
  params,
}: {
  params: { id: string };
}) {
  const { companion } = await requireCompanion(
    `/companion/visits/${params.id}/report`,
  );

  const visit = await prisma.visit.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      companionId: true,
      state: true,
      scheduledStartAt: true,
      scheduledDurationMinutes: true,
      recipient: { select: { firstName: true, preferredName: true } },
      report: { select: { id: true } },
    },
  });
  if (!visit || visit.companionId !== companion.id) notFound();

  // Can only submit from the 'completed' state. If they got here too
  // early (state=in_progress) or too late (already reported), bounce.
  if (visit.state !== 'completed' || visit.report) {
    redirect(`/companion/visits/${visit.id}`);
  }

  const name = visit.recipient.preferredName || visit.recipient.firstName;

  return (
    <div className="max-w-[720px]">
      <Link
        href={`/companion/visits/${visit.id}`}
        className="inline-flex items-center gap-1 text-stone hover:text-moss text-sm mb-4 transition-colors"
      >
        <ChevronLeft size={14} strokeWidth={1.75} aria-hidden="true" />
        Back to visit
      </Link>
      <header className="mb-6 flex items-center gap-3">
        <FileText size={22} strokeWidth={1.75} className="text-moss" aria-hidden="true" />
        <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1]">
          How did it go?
        </h1>
      </header>
      <p className="text-charcoal text-[0.9375rem] leading-[1.55] mb-6 max-w-[60ch]">
        Your visit to <strong>{name}</strong> on{' '}
        {formatUkDateTime(visit.scheduledStartAt)}. Aim to send this
        within four hours - the family is expecting it.
      </p>
      <ReportForm
        visitId={visit.id}
        defaultDurationMinutes={visit.scheduledDurationMinutes}
        recipientName={name}
      />
    </div>
  );
}
