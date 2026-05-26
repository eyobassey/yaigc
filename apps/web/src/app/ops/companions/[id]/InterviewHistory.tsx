import Link from 'next/link';
import { ClipboardList } from 'lucide-react';
import type {
  CompanionInterview,
  InterviewKind,
  InterviewRecommendation,
  RubricBand,
  UkSettledness,
  MotivationBand,
  VettingState,
  ComfortBand,
} from '@prisma/client';

// SDD Addendum §3. Read-only chronological log of operator interviews
// against an application. Each row glances the rubric so a future
// operator can spot the shape of the conversation without reading
// every line of the narrative.

const KIND_LABEL: Record<InterviewKind, string> = {
  phone_screen: 'Phone screen',
  in_person: 'In person',
  final: 'Final sign-off',
};

const RECOMMENDATION_LABEL: Record<InterviewRecommendation, string> = {
  proceed: 'Proceed',
  second_interview: 'Second interview',
  decline: 'Decline',
  accept: 'Accept',
};

const RECOMMENDATION_TONE: Record<InterviewRecommendation, string> = {
  proceed: 'bg-moss/10 text-moss',
  accept: 'bg-moss/15 text-moss',
  second_interview: 'bg-terracotta/10 text-terracotta',
  decline: 'bg-terracotta/15 text-terracotta',
};

const UK_LABEL: Record<UkSettledness, string> = {
  five_plus: '5+ years UK',
  three_to_five: '3-5 years UK',
  under_three: '<3 years UK',
  unclear: 'UK unclear',
  n_a: 'UK n/a',
};

const RUBRIC_LABEL: Record<RubricBand, string> = {
  strong: 'strong',
  present: 'present',
  unclear: 'unclear',
  absent: 'absent',
};

const MOTIVATION_LABEL: Record<MotivationBand, string> = {
  clear: 'beyond income',
  mixed: 'mixed motive',
  primarily_financial: 'financial first',
};

const VETTING_LABEL: Record<VettingState, string> = {
  yes: 'yes',
  no: 'no',
  unknown: 'unknown',
  not_taken_yet: 'not taken yet',
};

const COMFORT_LABEL: Record<ComfortBand, string> = {
  yes: 'yes',
  concerns: 'concerns',
  no: 'no',
};

type InterviewRow = CompanionInterview & {
  interviewer: { firstName: string | null; lastName: string | null; email: string };
};

export function InterviewHistory({
  applicationId,
  interviews,
}: {
  applicationId: string;
  interviews: InterviewRow[];
}) {
  return (
    <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone inline-flex items-center gap-2">
          <ClipboardList size={14} strokeWidth={1.75} className="text-moss" aria-hidden="true" />
          Interviews
        </h2>
        <Link
          href={`/ops/companions/${applicationId}/interviews/new`}
          className="text-moss text-[0.8125rem] hover:text-terracotta inline-flex items-center gap-1"
        >
          Log an interview
        </Link>
      </div>
      {interviews.length === 0 ? (
        <p className="text-stone text-[0.875rem] italic">No interviews logged yet.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {interviews.map((i) => (
            <InterviewRow key={i.id} interview={i} />
          ))}
        </ul>
      )}
    </section>
  );
}

function InterviewRow({ interview: i }: { interview: InterviewRow }) {
  const interviewerName =
    `${i.interviewer.firstName ?? ''} ${i.interviewer.lastName ?? ''}`.trim() ||
    i.interviewer.email;
  const chips: { label: string; tone: 'moss' | 'terracotta' | 'stone' }[] = [];
  if (i.ukSettledness) chips.push({ label: UK_LABEL[i.ukSettledness], tone: 'stone' });
  if (i.communityTemperament) {
    chips.push({
      label: `community: ${RUBRIC_LABEL[i.communityTemperament]}`,
      tone: bandTone(i.communityTemperament),
    });
  }
  if (i.readsARoom) {
    chips.push({
      label: `reads a room: ${RUBRIC_LABEL[i.readsARoom]}`,
      tone: bandTone(i.readsARoom),
    });
  }
  if (i.schedulingStability) {
    chips.push({
      label: `scheduling: ${RUBRIC_LABEL[i.schedulingStability]}`,
      tone: bandTone(i.schedulingStability),
    });
  }
  if (i.motivationBeyondIncome) {
    chips.push({
      label: MOTIVATION_LABEL[i.motivationBeyondIncome],
      tone: i.motivationBeyondIncome === 'primarily_financial' ? 'terracotta' : 'moss',
    });
  }
  if (i.dbsClearable) {
    chips.push({
      label: `DBS: ${VETTING_LABEL[i.dbsClearable]}`,
      tone: i.dbsClearable === 'no' ? 'terracotta' : i.dbsClearable === 'yes' ? 'moss' : 'stone',
    });
  }
  if (i.referencesPositive) {
    chips.push({
      label: `refs: ${VETTING_LABEL[i.referencesPositive]}`,
      tone:
        i.referencesPositive === 'no'
          ? 'terracotta'
          : i.referencesPositive === 'yes'
          ? 'moss'
          : 'stone',
    });
  }
  if (i.engagementTermsComfort) {
    chips.push({
      label: `terms: ${COMFORT_LABEL[i.engagementTermsComfort]}`,
      tone:
        i.engagementTermsComfort === 'no'
          ? 'terracotta'
          : i.engagementTermsComfort === 'yes'
          ? 'moss'
          : 'stone',
    });
  }
  if (i.trainingAcceptance) {
    chips.push({
      label: `training: ${COMFORT_LABEL[i.trainingAcceptance]}`,
      tone:
        i.trainingAcceptance === 'no'
          ? 'terracotta'
          : i.trainingAcceptance === 'yes'
          ? 'moss'
          : 'stone',
    });
  }

  return (
    <li className="border-l-2 border-moss/15 pl-4">
      <div className="flex items-center gap-2 flex-wrap mb-1">
        <span className="font-body text-[0.7rem] font-medium uppercase tracking-[0.08em] text-charcoal bg-moss/10 rounded px-2 py-0.5">
          {KIND_LABEL[i.kind]}
        </span>
        <span
          className={`inline-flex items-center font-body text-[0.7rem] font-medium uppercase tracking-[0.08em] px-2 py-0.5 rounded ${
            RECOMMENDATION_TONE[i.recommendation]
          }`}
        >
          {RECOMMENDATION_LABEL[i.recommendation]}
        </span>
        <time
          dateTime={i.happenedAt.toISOString()}
          className="text-stone text-[0.75rem] font-mono"
        >
          {i.happenedAt.toISOString().replace('T', ' ').slice(0, 16)}
        </time>
        <span className="text-stone text-[0.75rem]">· {interviewerName}</span>
      </div>
      {chips.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {chips.map((c, idx) => (
            <span
              key={idx}
              className={`inline-flex items-center font-body text-[0.6875rem] rounded-full px-2 py-0.5 ${
                c.tone === 'moss'
                  ? 'bg-moss/10 text-moss'
                  : c.tone === 'terracotta'
                  ? 'bg-terracotta/10 text-terracotta'
                  : 'bg-stone/10 text-stone'
              }`}
            >
              {c.label}
            </span>
          ))}
        </div>
      ) : null}
      <p className="text-charcoal text-[0.9375rem] leading-[1.55] whitespace-pre-wrap break-words">
        {i.notes}
      </p>
    </li>
  );
}

function bandTone(b: RubricBand): 'moss' | 'terracotta' | 'stone' {
  if (b === 'strong' || b === 'present') return 'moss';
  if (b === 'absent') return 'terracotta';
  return 'stone';
}
