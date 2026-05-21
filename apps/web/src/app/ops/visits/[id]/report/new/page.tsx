import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ChevronLeft, AlertTriangle } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { formatUkDateTime } from '@/lib/visit-schedule';
import { ReportForm } from './ReportForm';

export const metadata = { title: 'Submit post-visit report' };

export default async function NewPostVisitReportPage({
  params,
}: {
  params: { id: string };
}) {
  const visit = await prisma.visit.findUnique({
    where: { id: params.id },
    include: {
      family: { select: { id: true, billingName: true } },
      companion: { select: { firstName: true, lastName: true } },
      recipient: { select: { firstName: true, preferredName: true, consentToReportSharing: true } },
      report: { select: { id: true } },
    },
  });
  if (!visit) notFound();
  if (visit.state !== 'completed') {
    redirect(`/ops/visits/${visit.id}`);
  }
  if (visit.report) {
    redirect(`/ops/visits/${visit.id}`);
  }

  return (
    <div className="max-w-[720px]">
      <Link
        href={`/ops/visits/${visit.id}`}
        className="inline-flex items-center gap-1 text-stone hover:text-moss text-sm mb-4 transition-colors"
      >
        <ChevronLeft size={14} strokeWidth={1.75} aria-hidden="true" />
        Back to visit
      </Link>
      <header className="mb-8">
        <span className="font-body text-[0.75rem] font-medium uppercase tracking-[0.12em] text-stone mb-2 inline-block">
          Post-visit report
        </span>
        <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1] break-words">
          {visit.companion.firstName} {visit.companion.lastName}
          <span className="text-stone font-body font-normal mx-2 text-[1.25rem]">·</span>
          {visit.recipient.preferredName || visit.recipient.firstName}
        </h1>
        <p className="text-stone text-[0.9375rem] leading-[1.55] mt-2">
          Captured from the companion. Visited on {formatUkDateTime(visit.scheduledStartAt)}.
        </p>
      </header>

      {!visit.recipient.consentToReportSharing ? (
        <div className="mb-6 bg-amber-50 border-l-4 border-amber-400 px-5 py-4 rounded-r">
          <p className="font-body text-[0.7rem] font-medium uppercase tracking-[0.12em] text-amber-700 mb-1 flex items-center gap-2">
            <AlertTriangle size={14} strokeWidth={2} aria-hidden="true" />
            Recipient has not consented to report sharing
          </p>
          <p className="text-charcoal text-[0.9375rem] leading-[1.55]">
            The report will be filed and audit-logged, but the family will not receive the redacted summary email. To enable, open the recipient and toggle Report sharing consent.
          </p>
        </div>
      ) : null}

      <ReportForm
        visitId={visit.id}
        defaultDurationMinutes={visit.scheduledDurationMinutes}
      />
    </div>
  );
}
