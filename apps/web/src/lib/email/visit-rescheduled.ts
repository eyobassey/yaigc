import { brand } from '@igc/content';
import {
  renderEmailHtml,
  renderEmailText,
  type EmailBlocks,
} from './_chrome';
import { formatUkDateTime } from '@/lib/visit-schedule';

// Sent when an operator changes the scheduled time or duration of an
// existing Visit (state must be scheduled or confirmed - past visits
// are not editable).

interface VisitInput {
  previousStartAt: Date;
  scheduledStartAt: Date;
  scheduledDurationMinutes: number;
  recipientFirstName: string;
  recipientPreferredName: string | null;
  companionFirstName: string;
  companionLastName: string;
  familyBillingName: string;
}

function durationLabel(min: number) {
  if (min % 60 === 0) return `${min / 60} hour${min === 60 ? '' : 's'}`;
  return `${min} minutes`;
}

export interface VisitRescheduledToFamilyInput extends VisitInput {}

function familyBlocks(input: VisitRescheduledToFamilyInput): EmailBlocks {
  const name = input.recipientPreferredName || input.recipientFirstName;
  return {
    preheader: `Visit moved to ${formatUkDateTime(input.scheduledStartAt)}.`,
    titleTag: `Visit rescheduled  ·  ${brand.fullName}`,
    heading: 'Visit moved.',
    italicSubline: `New time: ${formatUkDateTime(input.scheduledStartAt)}.`,
    lead: `${input.companionFirstName}'s visit to ${name} has moved. The recurring rhythm is unchanged.`,
    dataRowsHeading: 'Updated visit',
    dataRows: [
      { label: 'Was', value: formatUkDateTime(input.previousStartAt) },
      { label: 'Now', value: formatUkDateTime(input.scheduledStartAt) },
      { label: 'Duration', value: durationLabel(input.scheduledDurationMinutes) },
      { label: 'Companion', value: `${input.companionFirstName} ${input.companionLastName}` },
      { label: 'Recipient', value: name },
    ],
    nextSteps: ['A reminder goes out 24 hours before the new time.'],
  };
}

export function visitRescheduledToFamilyHtml(input: VisitRescheduledToFamilyInput) {
  return renderEmailHtml(familyBlocks(input));
}
export function visitRescheduledToFamilyText(input: VisitRescheduledToFamilyInput) {
  return renderEmailText(familyBlocks(input));
}
export function visitRescheduledToFamilySubject(input: VisitRescheduledToFamilyInput) {
  return `Visit moved to ${formatUkDateTime(input.scheduledStartAt)}  ·  ${brand.fullName}`;
}

export interface VisitRescheduledToCompanionInput extends VisitInput {}

function companionBlocks(input: VisitRescheduledToCompanionInput): EmailBlocks {
  const name = input.recipientPreferredName || input.recipientFirstName;
  return {
    preheader: `Visit moved to ${formatUkDateTime(input.scheduledStartAt)}.`,
    titleTag: `Visit rescheduled  ·  ${brand.fullName}`,
    heading: `Visit moved, ${input.companionFirstName}.`,
    italicSubline: `New time: ${formatUkDateTime(input.scheduledStartAt)}.`,
    lead: `Your visit to ${name} has been moved. Address and access notes are unchanged from the original booking.`,
    dataRowsHeading: 'Updated visit',
    dataRows: [
      { label: 'Was', value: formatUkDateTime(input.previousStartAt) },
      { label: 'Now', value: formatUkDateTime(input.scheduledStartAt) },
      { label: 'Duration', value: durationLabel(input.scheduledDurationMinutes) },
      { label: 'Family', value: input.familyBillingName },
      { label: 'Recipient', value: name },
    ],
  };
}

export function visitRescheduledToCompanionHtml(input: VisitRescheduledToCompanionInput) {
  return renderEmailHtml(companionBlocks(input));
}
export function visitRescheduledToCompanionText(input: VisitRescheduledToCompanionInput) {
  return renderEmailText(companionBlocks(input));
}
export function visitRescheduledToCompanionSubject(input: VisitRescheduledToCompanionInput) {
  return `Visit moved to ${formatUkDateTime(input.scheduledStartAt)}  ·  ${brand.fullName}`;
}
