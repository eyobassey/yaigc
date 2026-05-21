import { brand } from '@igc/content';
import {
  renderEmailHtml,
  renderEmailText,
  type EmailBlocks,
} from './_chrome';
import { formatUkDateTime } from '@/lib/visit-schedule';

// 24-hour reminder. Two flavours, one per audience. Sent by the
// /api/cron/visit-reminders endpoint that the systemd timer hits hourly.

interface VisitInput {
  scheduledStartAt: Date;
  recipientFirstName: string;
  recipientPreferredName: string | null;
  companionFirstName: string;
  companionLastName: string;
}

export interface VisitReminderToFamilyInput extends VisitInput {}

function familyBlocks(input: VisitReminderToFamilyInput): EmailBlocks {
  const name = input.recipientPreferredName || input.recipientFirstName;
  return {
    preheader: `Tomorrow: ${input.companionFirstName} visits ${name}.`,
    titleTag: `Reminder: visit tomorrow  ·  ${brand.fullName}`,
    heading: 'Just a reminder.',
    italicSubline: `Tomorrow at ${formatUkDateTime(input.scheduledStartAt)}.`,
    lead: `${input.companionFirstName} ${input.companionLastName} is visiting ${name} tomorrow. We will send a short note after the visit.`,
  };
}

export function visitReminderToFamilyHtml(input: VisitReminderToFamilyInput) {
  return renderEmailHtml(familyBlocks(input));
}
export function visitReminderToFamilyText(input: VisitReminderToFamilyInput) {
  return renderEmailText(familyBlocks(input));
}
export function visitReminderToFamilySubject(input: VisitReminderToFamilyInput) {
  return `Reminder: visit tomorrow at ${formatUkDateTime(input.scheduledStartAt)}  ·  ${brand.fullName}`;
}

export interface VisitReminderToCompanionInput extends VisitInput {
  addressLine1: string | null;
  addressLine2: string | null;
  addressCity: string | null;
  addressPostcode: string | null;
}

function companionBlocks(input: VisitReminderToCompanionInput): EmailBlocks {
  const name = input.recipientPreferredName || input.recipientFirstName;
  const addressParts = [
    input.addressLine1,
    input.addressLine2,
    input.addressCity,
    input.addressPostcode,
  ].filter(Boolean) as string[];
  return {
    preheader: `Tomorrow: visit to ${name} at ${formatUkDateTime(input.scheduledStartAt)}.`,
    titleTag: `Reminder: visit tomorrow  ·  ${brand.fullName}`,
    heading: `Tomorrow, ${input.companionFirstName}.`,
    italicSubline: `Visit at ${formatUkDateTime(input.scheduledStartAt)}.`,
    lead: `Quick reminder of tomorrow's visit. Address and access notes are in your original booking email; the key details are below.`,
    dataRowsHeading: "Tomorrow's visit",
    dataRows: [
      { label: 'When', value: formatUkDateTime(input.scheduledStartAt) },
      { label: 'Recipient', value: name },
      ...(addressParts.length
        ? [{ label: 'Address', value: addressParts.join(', ') }]
        : []),
    ],
  };
}

export function visitReminderToCompanionHtml(input: VisitReminderToCompanionInput) {
  return renderEmailHtml(companionBlocks(input));
}
export function visitReminderToCompanionText(input: VisitReminderToCompanionInput) {
  return renderEmailText(companionBlocks(input));
}
export function visitReminderToCompanionSubject(input: VisitReminderToCompanionInput) {
  return `Reminder: visit tomorrow at ${formatUkDateTime(input.scheduledStartAt)}  ·  ${brand.fullName}`;
}
