import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { requireOperator } from '@/lib/auth-helpers';
import { LogInterviewForm } from './LogInterviewForm';

export const metadata = { title: 'Log an interview' };

// SDD Addendum §3.3. The operator opens this page after a phone
// screen, in-person interview, or final sign-off. The Phase 0
// answers from the application sit alongside the rubric so the
// operator can read them while scoring.

export default async function NewInterviewPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const actor = await requireOperator(
    `/ops/companions/${params.id}/interviews/new`,
  );

  const application = await prisma.companionApplication.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      status: true,
      deletedAt: true,
      motivation: true,
      experienceAlongside: true,
      yearsSettledLocally: true,
      weeklyStabilityNote: true,
      whyJoinReason: true,
      aboutYou: true,
      interviews: {
        select: { id: true, interviewerOperatorId: true, kind: true },
      },
    },
  });
  if (!application || application.deletedAt) notFound();

  // Sensible default for the kind selector: phone_screen if no
  // interviews yet, in_person if exactly one phone_screen, final
  // otherwise. The operator can change it.
  const interviews = application.interviews;
  const hasPhoneScreen = interviews.some((i) => i.kind === 'phone_screen');
  const hasInPerson = interviews.some((i) => i.kind === 'in_person');
  const defaultKind = !hasPhoneScreen
    ? 'phone_screen'
    : !hasInPerson
    ? 'in_person'
    : 'final';

  // T.5 soft warning input: how many prior interviews from how many
  // distinct operators? Computed here so the form can render the
  // warning when the operator picks a decline recommendation.
  const distinctInterviewerIds = new Set(
    interviews.map((i) => i.interviewerOperatorId),
  );
  const onlyOneOperatorSoFar =
    interviews.length > 0 && distinctInterviewerIds.size === 1;
  const currentOperatorAlsoInterviewed = interviews.some(
    (i) => i.interviewerOperatorId === actor.id,
  );

  const presetKind = String(searchParams.kind ?? '');
  const kindFromQuery = ['phone_screen', 'in_person', 'final'].includes(presetKind)
    ? (presetKind as 'phone_screen' | 'in_person' | 'final')
    : null;

  // <input type="datetime-local"> default = now in UK local time.
  const nowParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const lookup: Record<string, string> = {};
  for (const p of nowParts) lookup[p.type] = p.value;
  const defaultHappenedAt = `${lookup.year}-${lookup.month}-${lookup.day}T${
    lookup.hour === '24' ? '00' : lookup.hour
  }:${lookup.minute}`;

  return (
    <div className="max-w-[860px]">
      <Link
        href={`/ops/companions/${application.id}`}
        className="inline-flex items-center gap-1 text-stone hover:text-moss text-sm mb-4 transition-colors"
      >
        <ChevronLeft size={14} strokeWidth={1.75} aria-hidden="true" />
        Back to application
      </Link>

      <header className="mb-8">
        <span className="font-body text-[0.75rem] font-medium uppercase tracking-[0.12em] text-stone mb-2 inline-block">
          Log an interview
        </span>
        <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1] break-words">
          {application.firstName} {application.lastName}
        </h1>
        <p className="text-stone text-[0.9375rem] leading-[1.55] mt-3 max-w-[60ch]">
          Soft Likert bands - leave any dimension blank if you have not formed a
          view. The narrative is what matters; the bands help future operators
          find their bearings on this candidate quickly.
        </p>
      </header>

      <LogInterviewForm
        applicationId={application.id}
        operatorRole={actor.role}
        defaultKind={kindFromQuery ?? defaultKind}
        defaultHappenedAt={defaultHappenedAt}
        phaseZero={{
          motivation: application.motivation,
          experienceAlongside: application.experienceAlongside,
          yearsSettledLocally: application.yearsSettledLocally,
          weeklyStabilityNote: application.weeklyStabilityNote,
          whyJoinReason: application.whyJoinReason,
          aboutYou: application.aboutYou,
        }}
        secondInterviewGuard={{
          priorCount: interviews.length,
          onlyOneOperatorSoFar,
          currentOperatorAlsoInterviewed,
        }}
      />
    </div>
  );
}
