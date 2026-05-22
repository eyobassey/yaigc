import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, FileText } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { requireCompanion } from '@/lib/auth-helpers';
import { formatUkDateTime } from '@/lib/visit-schedule';

export const metadata = { title: 'Submit your note' };

// C.3 stub. C.4 replaces this with the actual self-submit form
// (whatHappened narrative, wellbeing radio, things-to-flag, photos).
// For now: confirm the companion is in the right place and explain
// that the form is on its way.

export default async function CompanionVisitReportPlaceholder({
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
      recipient: { select: { firstName: true, preferredName: true } },
    },
  });
  if (!visit || visit.companionId !== companion.id) notFound();

  return (
    <div className="max-w-[640px]">
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
          Submit your note
        </h1>
      </header>
      <p className="text-charcoal text-[0.9375rem] leading-[1.55] mb-4 max-w-[60ch]">
        For the visit to{' '}
        <strong>
          {visit.recipient.preferredName || visit.recipient.firstName}
        </strong>{' '}
        on {formatUkDateTime(visit.scheduledStartAt)}.
      </p>
      <div className="bg-amber-50 border-l-4 border-amber-400 px-5 py-4 rounded-r">
        <p className="font-body text-[0.7rem] font-medium uppercase tracking-[0.12em] text-amber-700 mb-1">
          Coming in the next update
        </p>
        <p className="text-charcoal text-[0.9375rem] leading-[1.55]">
          The self-submit form for your post-visit note + photos lands
          shortly. For now, ring us with what happened and we will
          submit it on your behalf within the four-hour window.
        </p>
      </div>
    </div>
  );
}
