import { brand } from '@igc/content';
import {
  renderEmailHtml,
  renderEmailText,
  SITE_URL,
  type EmailBlocks,
} from './_chrome';
import {
  DAY_LABELS,
  FREQUENCY_LABELS,
} from '@/lib/subscription-format';

// Sent when an operator creates a Subscription (the recurring schedule
// the family pays for). Two flavours, one per audience.

interface ScheduleInput {
  frequency: string;
  dayOfWeek: string;
  startTime: string;
  durationMinutes: number;
  hourlyRate: string;
}

function durationLabel(min: number) {
  if (min % 60 === 0) return `${min / 60} hour${min === 60 ? '' : 's'}`;
  return `${min} minutes`;
}

function visitCost(s: ScheduleInput) {
  const hours = s.durationMinutes / 60;
  const cost = hours * Number(s.hourlyRate);
  return cost.toFixed(2);
}

function scheduleRows(s: ScheduleInput) {
  return [
    { label: 'Frequency', value: FREQUENCY_LABELS[s.frequency] ?? s.frequency },
    { label: 'Day', value: DAY_LABELS[s.dayOfWeek] ?? s.dayOfWeek },
    { label: 'Start time', value: `${s.startTime} (UK local time)` },
    { label: 'Duration', value: durationLabel(s.durationMinutes) },
    { label: 'Rate', value: `£${Number(s.hourlyRate).toFixed(2)} / hour` },
    { label: 'Cost per visit', value: `£${visitCost(s)}` },
  ];
}

export interface SubscriptionCreatedToFamilyInput extends ScheduleInput {
  recipientFirstName: string;
  recipientPreferredName: string | null;
  companionFirstName: string;
  companionLastName: string;
}

function familyBlocks(input: SubscriptionCreatedToFamilyInput): EmailBlocks {
  const name = input.recipientPreferredName || input.recipientFirstName;
  return {
    preheader: `Booking confirmed: ${input.companionFirstName} visiting ${name} ${(FREQUENCY_LABELS[input.frequency] ?? input.frequency).toLowerCase()}.`,
    titleTag: `Booking confirmed  ·  ${brand.fullName}`,
    heading: 'Booking confirmed.',
    italicSubline: `${input.companionFirstName} visiting ${name}.`,
    lead: `This is the recurring rhythm we have set up. Visits start at the next scheduled slot - we will send a reminder 24 hours before each one.`,
    dataRowsHeading: 'Your booking',
    dataRows: [
      ...scheduleRows(input),
      {
        label: 'Companion',
        value: `${input.companionFirstName} ${input.companionLastName}`,
      },
      { label: 'Recipient', value: name },
    ],
    nextSteps: [
      'We schedule the first visit and email you the date.',
      'You get a reminder 24 hours before every visit.',
      `Within four hours of each visit, ${input.companionFirstName} sends a short note about how it went.`,
      'You can pause or cancel at any time from your account.',
    ],
    cta: {
      label: 'Sign in to your account',
      href: `${SITE_URL}/sign-in`,
      subline: 'We email you a one-time sign-in link, no password needed.',
    },
  };
}

export function subscriptionCreatedToFamilyHtml(input: SubscriptionCreatedToFamilyInput) {
  return renderEmailHtml(familyBlocks(input));
}
export function subscriptionCreatedToFamilyText(input: SubscriptionCreatedToFamilyInput) {
  return renderEmailText(familyBlocks(input));
}
export function subscriptionCreatedToFamilySubject() {
  return `Booking confirmed  ·  ${brand.fullName}`;
}

export interface SubscriptionCreatedToCompanionInput extends ScheduleInput {
  companionFirstName: string;
  familyBillingName: string;
  recipientFirstName: string;
  recipientPreferredName: string | null;
}

function companionBlocks(input: SubscriptionCreatedToCompanionInput): EmailBlocks {
  const name = input.recipientPreferredName || input.recipientFirstName;
  return {
    preheader: `Schedule confirmed: ${input.familyBillingName}, ${(FREQUENCY_LABELS[input.frequency] ?? input.frequency).toLowerCase()}.`,
    titleTag: `Schedule confirmed  ·  ${brand.fullName}`,
    heading: `Schedule confirmed, ${input.companionFirstName}.`,
    italicSubline: `Visiting ${name}.`,
    lead: `This is the recurring rhythm the family has booked. The first visit date and the address come in a separate booking email closer to the time.`,
    dataRowsHeading: 'Your booking',
    dataRows: [
      ...scheduleRows(input),
      { label: 'Family', value: input.familyBillingName },
      { label: 'Recipient', value: name },
    ],
    nextSteps: [
      'We send a booking email for each visit with the address, access notes, and any specifics the family asked us to pass on.',
      `Submit a short note within four hours of every visit. The family sees a redacted version.`,
      'If something at the visit feels off, flag it in the report or call us straight away.',
    ],
  };
}

export function subscriptionCreatedToCompanionHtml(input: SubscriptionCreatedToCompanionInput) {
  return renderEmailHtml(companionBlocks(input));
}
export function subscriptionCreatedToCompanionText(input: SubscriptionCreatedToCompanionInput) {
  return renderEmailText(companionBlocks(input));
}
export function subscriptionCreatedToCompanionSubject() {
  return `Schedule confirmed  ·  ${brand.fullName}`;
}
