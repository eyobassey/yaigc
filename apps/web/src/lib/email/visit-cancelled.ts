import { brand } from '@igc/content';
import {
  renderEmailHtml,
  renderEmailText,
  type EmailBlocks,
} from './_chrome';
import { formatUkDateTime } from '@/lib/visit-schedule';

// Sent when a single visit is cancelled (vs. when the whole subscription
// ends, which is a different email). Tone shifts depending on who
// cancelled.

type LeadFn = (name: string, companion: string) => string;

const ACTOR_LEAD: Record<string, LeadFn> = {
  family: (name) => `The family has had to cancel this visit to ${name}.`,
  companion: (_name, c) => `${c} has had to cancel this visit.`,
  operator: (name) => `We have cancelled this visit to ${name}.`,
};

const DEFAULT_LEAD: LeadFn = (name) => `This visit to ${name} has been cancelled.`;

interface VisitInput {
  scheduledStartAt: Date;
  recipientFirstName: string;
  recipientPreferredName: string | null;
  companionFirstName: string;
  companionLastName: string;
  cancellationActor: string;
  cancellationReason: string | null;
}

export interface VisitCancelledToFamilyInput extends VisitInput {}

function familyBlocks(input: VisitCancelledToFamilyInput): EmailBlocks {
  const name = input.recipientPreferredName || input.recipientFirstName;
  const leadFn = ACTOR_LEAD[input.cancellationActor] ?? DEFAULT_LEAD;
  const lead = leadFn(name, input.companionFirstName) + ' The next visit in the recurring rhythm is unaffected.';
  return {
    preheader: `Visit cancelled: ${formatUkDateTime(input.scheduledStartAt)}.`,
    titleTag: `Visit cancelled  ·  ${brand.fullName}`,
    heading: 'Visit cancelled.',
    italicSubline: `${formatUkDateTime(input.scheduledStartAt)}.`,
    lead,
    dataRowsHeading: 'Cancelled visit',
    dataRows: [
      { label: 'When', value: formatUkDateTime(input.scheduledStartAt) },
      { label: 'Companion', value: `${input.companionFirstName} ${input.companionLastName}` },
      { label: 'Recipient', value: name },
      ...(input.cancellationReason
        ? [{ label: 'Reason', value: input.cancellationReason }]
        : []),
    ],
    nextSteps: [
      'Your recurring booking is unchanged.',
      'If you would like to swap to a different time this week, reply to this email or call us.',
    ],
  };
}

export function visitCancelledToFamilyHtml(input: VisitCancelledToFamilyInput) {
  return renderEmailHtml(familyBlocks(input));
}
export function visitCancelledToFamilyText(input: VisitCancelledToFamilyInput) {
  return renderEmailText(familyBlocks(input));
}
export function visitCancelledToFamilySubject() {
  return `Visit cancelled  ·  ${brand.fullName}`;
}

export interface VisitCancelledToCompanionInput extends VisitInput {
  familyBillingName: string;
}

function companionBlocks(input: VisitCancelledToCompanionInput): EmailBlocks {
  const name = input.recipientPreferredName || input.recipientFirstName;
  const lead =
    input.cancellationActor === 'companion'
      ? `Confirming we have cancelled this visit on your behalf.`
      : input.cancellationActor === 'family'
      ? `The family has cancelled this visit to ${name}. Your other bookings are unaffected.`
      : `We have cancelled this visit to ${name}. Your other bookings are unaffected.`;
  return {
    preheader: `Visit cancelled: ${formatUkDateTime(input.scheduledStartAt)}.`,
    titleTag: `Visit cancelled  ·  ${brand.fullName}`,
    heading: `Visit cancelled, ${input.companionFirstName}.`,
    italicSubline: `${formatUkDateTime(input.scheduledStartAt)}.`,
    lead,
    dataRowsHeading: 'Cancelled visit',
    dataRows: [
      { label: 'When', value: formatUkDateTime(input.scheduledStartAt) },
      { label: 'Family', value: input.familyBillingName },
      { label: 'Recipient', value: name },
      ...(input.cancellationReason
        ? [{ label: 'Reason', value: input.cancellationReason }]
        : []),
    ],
    nextSteps: ['The next visit in the rhythm is unchanged. We will see you then.'],
  };
}

export function visitCancelledToCompanionHtml(input: VisitCancelledToCompanionInput) {
  return renderEmailHtml(companionBlocks(input));
}
export function visitCancelledToCompanionText(input: VisitCancelledToCompanionInput) {
  return renderEmailText(companionBlocks(input));
}
export function visitCancelledToCompanionSubject() {
  return `Visit cancelled  ·  ${brand.fullName}`;
}
