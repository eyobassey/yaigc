import { brand } from '@igc/content';
import {
  renderEmailHtml,
  renderEmailText,
  type EmailBlocks,
} from './_chrome';
import { formatUkDateTime, formatUkTime } from '@/lib/visit-schedule';

// Sent to family + companion when a new Visit is generated. The address
// is included only in the companion's copy (until the family portal
// lands, the family has billing-only access to their own household).

interface VisitInput {
  scheduledStartAt: Date;
  scheduledDurationMinutes: number;
  recipientFirstName: string;
  recipientPreferredName: string | null;
  companionFirstName: string;
  companionLastName: string;
  familyBillingName: string;
  agreedActivity: string | null;
}

function durationLabel(min: number) {
  if (min % 60 === 0) return `${min / 60} hour${min === 60 ? '' : 's'}`;
  return `${min} minutes`;
}

function scheduleEnd(start: Date, durationMinutes: number) {
  return new Date(start.getTime() + durationMinutes * 60 * 1000);
}

export interface VisitBookedToFamilyInput extends VisitInput {}

function familyBlocks(input: VisitBookedToFamilyInput): EmailBlocks {
  const name = input.recipientPreferredName || input.recipientFirstName;
  const endAt = scheduleEnd(input.scheduledStartAt, input.scheduledDurationMinutes);
  return {
    preheader: `${input.companionFirstName} visiting ${name} on ${formatUkDateTime(input.scheduledStartAt)}.`,
    titleTag: `Visit scheduled  ·  ${brand.fullName}`,
    heading: 'Visit scheduled.',
    italicSubline: `${input.companionFirstName} visiting ${name}.`,
    lead: `Confirming a visit on ${formatUkDateTime(input.scheduledStartAt)}. We will send a reminder 24 hours before.`,
    dataRowsHeading: 'Your visit',
    dataRows: [
      { label: 'When', value: formatUkDateTime(input.scheduledStartAt) },
      {
        label: 'Time',
        value: `${formatUkTime(input.scheduledStartAt)} - ${formatUkTime(endAt)} UK time`,
      },
      { label: 'Duration', value: durationLabel(input.scheduledDurationMinutes) },
      { label: 'Companion', value: `${input.companionFirstName} ${input.companionLastName}` },
      { label: 'Recipient', value: name },
      ...(input.agreedActivity
        ? [{ label: 'What is planned', value: input.agreedActivity }]
        : []),
    ],
    nextSteps: [
      'A reminder goes out 24 hours before the visit.',
      `${input.companionFirstName} will call ahead on the day if anything changes.`,
      `Within four hours of the visit you receive a short note about how it went.`,
    ],
  };
}

export function visitBookedToFamilyHtml(input: VisitBookedToFamilyInput) {
  return renderEmailHtml(familyBlocks(input));
}
export function visitBookedToFamilyText(input: VisitBookedToFamilyInput) {
  return renderEmailText(familyBlocks(input));
}
export function visitBookedToFamilySubject(input: VisitBookedToFamilyInput) {
  return `Visit scheduled - ${formatUkDateTime(input.scheduledStartAt)}  ·  ${brand.fullName}`;
}

export interface VisitBookedToCompanionInput extends VisitInput {
  addressLine1: string | null;
  addressLine2: string | null;
  addressCity: string | null;
  addressPostcode: string | null;
  thingsToKnow: string | null;
}

function companionBlocks(input: VisitBookedToCompanionInput): EmailBlocks {
  const name = input.recipientPreferredName || input.recipientFirstName;
  const endAt = scheduleEnd(input.scheduledStartAt, input.scheduledDurationMinutes);
  const addressParts = [
    input.addressLine1,
    input.addressLine2,
    input.addressCity,
    input.addressPostcode,
  ].filter(Boolean) as string[];
  return {
    preheader: `${formatUkDateTime(input.scheduledStartAt)}: visiting ${name} (${input.familyBillingName}).`,
    titleTag: `Visit scheduled  ·  ${brand.fullName}`,
    heading: `Visit scheduled, ${input.companionFirstName}.`,
    italicSubline: `Visiting ${name}.`,
    lead: `You are booked to visit ${name} on ${formatUkDateTime(input.scheduledStartAt)}. Address and any specifics below.`,
    dataRowsHeading: 'Your visit',
    dataRows: [
      { label: 'When', value: formatUkDateTime(input.scheduledStartAt) },
      {
        label: 'Time',
        value: `${formatUkTime(input.scheduledStartAt)} - ${formatUkTime(endAt)} UK time`,
      },
      { label: 'Duration', value: durationLabel(input.scheduledDurationMinutes) },
      { label: 'Recipient', value: name },
      { label: 'Family', value: input.familyBillingName },
      ...(addressParts.length
        ? [{ label: 'Address', value: addressParts.join(', ') }]
        : []),
      ...(input.thingsToKnow
        ? [{ label: 'Things to know', value: input.thingsToKnow }]
        : []),
      ...(input.agreedActivity
        ? [{ label: 'What is planned', value: input.agreedActivity }]
        : []),
    ],
    nextSteps: [
      'Call us on the support line if anything stops you making the visit. Soonest we hear, soonest we can call the family.',
      'On arrival, we will move you through to in-progress when you ring or text us. (Companion portal lands soon.)',
      'Within four hours of the visit, submit a short note - we send a redacted version to the family.',
    ],
  };
}

export function visitBookedToCompanionHtml(input: VisitBookedToCompanionInput) {
  return renderEmailHtml(companionBlocks(input));
}
export function visitBookedToCompanionText(input: VisitBookedToCompanionInput) {
  return renderEmailText(companionBlocks(input));
}
export function visitBookedToCompanionSubject(input: VisitBookedToCompanionInput) {
  return `Visit scheduled - ${formatUkDateTime(input.scheduledStartAt)}  ·  ${brand.fullName}`;
}
