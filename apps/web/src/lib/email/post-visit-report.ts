import { brand } from '@igc/content';
import {
  renderEmailHtml,
  renderEmailText,
  type EmailBlocks,
} from './_chrome';
import { formatUkDateTime } from '@/lib/visit-schedule';

// Sent to family members after a PostVisitReport is submitted, when
// recipient.consentToReportSharing is true. REDACTED: includes the
// companion's narrative and wellbeing rating, but NOT the
// operator-only thingsToFlag content. Things-to-flag content drives
// the safeguarding queue (Stage O.7.5), not the family inbox.

const WELLBEING_LABEL: Record<string, string> = {
  cheerful: 'Cheerful and chatty',
  quiet: 'Quiet but settled',
  tired: 'Tired',
  unwell: 'Not feeling their best',
  distressed: 'Upset, we are following up',
  other: 'Mixed - note below',
};

function durationLabel(min: number) {
  if (min % 60 === 0) return `${min / 60} hour${min === 60 ? '' : 's'}`;
  return `${min} minutes`;
}

export interface PostVisitReportToFamilyInput {
  scheduledStartAt: Date;
  actualDurationMinutes: number;
  recipientFirstName: string;
  recipientPreferredName: string | null;
  companionFirstName: string;
  whatHappened: string;
  howWereThey: string;
  howWereTheyNote: string | null;
}

function blocks(input: PostVisitReportToFamilyInput): EmailBlocks {
  const name = input.recipientPreferredName || input.recipientFirstName;
  return {
    preheader: `How ${name} got on with ${input.companionFirstName} today.`,
    titleTag: `How ${name} got on  ·  ${brand.fullName}`,
    heading: `A note about today.`,
    italicSubline: `${input.companionFirstName} and ${name}.`,
    lead: `Following ${input.companionFirstName}'s visit to ${name} on ${formatUkDateTime(input.scheduledStartAt)}. Here is what happened, in their own words.`,
    dataRowsHeading: 'The visit',
    dataRows: [
      { label: 'When', value: formatUkDateTime(input.scheduledStartAt) },
      { label: 'Length', value: durationLabel(input.actualDurationMinutes) },
      { label: 'Companion', value: input.companionFirstName },
      {
        label: 'How they seemed',
        value: WELLBEING_LABEL[input.howWereThey] ?? input.howWereThey,
      },
      ...(input.howWereTheyNote
        ? [{ label: 'A little more', value: input.howWereTheyNote }]
        : []),
      { label: 'What happened', value: input.whatHappened },
    ],
    nextSteps: [
      'The next visit in your recurring rhythm is unchanged.',
      'If anything in this note is something you want to talk through, reply or call us.',
    ],
  };
}

export function postVisitReportToFamilyHtml(input: PostVisitReportToFamilyInput) {
  return renderEmailHtml(blocks(input));
}
export function postVisitReportToFamilyText(input: PostVisitReportToFamilyInput) {
  return renderEmailText(blocks(input));
}
export function postVisitReportToFamilySubject(input: PostVisitReportToFamilyInput) {
  const name = input.recipientPreferredName || input.recipientFirstName;
  return `How ${name} got on with ${input.companionFirstName}  ·  ${brand.fullName}`;
}
