import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { EditForm } from './EditForm';

export const metadata = { title: 'Edit visit' };

export default async function EditVisitPage({
  params,
}: {
  params: { id: string };
}) {
  const visit = await prisma.visit.findUnique({
    where: { id: params.id },
    include: {
      family: { select: { id: true, billingName: true } },
      companion: { select: { firstName: true, lastName: true } },
      recipient: { select: { firstName: true, preferredName: true } },
    },
  });
  if (!visit) notFound();
  if (visit.state !== 'scheduled' && visit.state !== 'confirmed') {
    redirect(`/ops/visits/${visit.id}`);
  }

  // Render the existing scheduledStartAt as UK-local date + time strings
  // so the operator sees what the family sees.
  const dateParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(visit.scheduledStartAt);
  const p: Record<string, string> = {};
  for (const part of dateParts) p[part.type] = part.value;
  const defaultDate = `${p.year}-${p.month}-${p.day}`;
  const defaultTime = `${p.hour === '24' ? '00' : p.hour}:${p.minute}`;

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
          Edit visit
        </span>
        <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1] break-words">
          {visit.companion.firstName} {visit.companion.lastName}
          <span className="text-stone font-body font-normal mx-2 text-[1.25rem]">·</span>
          {visit.recipient.preferredName || visit.recipient.firstName}
        </h1>
        <p className="text-stone text-[0.9375rem] leading-[1.55] mt-2">
          Changing the date, time, or duration emails both sides. Notes-only edits stay quiet.
        </p>
      </header>

      <EditForm
        visitId={visit.id}
        defaultDate={defaultDate}
        defaultTime={defaultTime}
        defaultDurationMinutes={visit.scheduledDurationMinutes}
        defaultAgreedActivity={visit.agreedActivity}
        defaultSafetyFlags={visit.safetyFlags}
      />
    </div>
  );
}
