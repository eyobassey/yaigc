import { brand } from '@igc/content';
import {
  renderEmailHtml,
  renderEmailText,
  SITE_URL,
  type EmailBlocks,
} from './_chrome';

// Sent when a Match transitions to "accepted" (both phone-call
// confirmations have been captured by the operator). Two flavours, one
// per audience.

export interface MatchConfirmedToFamilyInput {
  recipientFirstName: string;
  recipientPreferredName: string | null;
  companionFirstName: string;
  companionLastName: string;
  companionBorough: string;
  companionBio: string | null;
}

function callName(input: MatchConfirmedToFamilyInput) {
  return input.recipientPreferredName || input.recipientFirstName;
}

function familyBlocks(input: MatchConfirmedToFamilyInput): EmailBlocks {
  const name = callName(input);
  return {
    preheader: `Confirmed: ${input.companionFirstName} will be visiting ${name}.`,
    titleTag: `Confirmed - matched with ${input.companionFirstName}  ·  ${brand.fullName}`,
    heading: `Confirmed.`,
    italicSubline: `You are matched with ${input.companionFirstName}.`,
    lead: `Confirming the call. We have noted that you are happy for ${input.companionFirstName} ${input.companionLastName} to visit ${name}. The schedule will follow once we set up the booking.`,
    dataRowsHeading: 'About your companion',
    dataRows: [
      { label: 'Companion', value: `${input.companionFirstName} ${input.companionLastName}` },
      { label: 'Area', value: input.companionBorough.replace(/_/g, ' ') },
      ...(input.companionBio ? [{ label: 'A little about them', value: input.companionBio }] : []),
    ],
    nextSteps: [
      `We confirm the recurring schedule with ${input.companionFirstName} and you, then send a booking confirmation email with the day, time and duration.`,
      `First visit is set up as soon as you both confirm the rhythm. You can pause or cancel at any time.`,
      `After every visit you get a short note from ${input.companionFirstName} within four hours.`,
    ],
    cta: {
      label: 'Sign in to your account',
      href: `${SITE_URL}/sign-in`,
      subline: 'We email you a one-time sign-in link, no password needed.',
    },
  };
}

export function matchConfirmedToFamilyHtml(input: MatchConfirmedToFamilyInput) {
  return renderEmailHtml(familyBlocks(input));
}
export function matchConfirmedToFamilyText(input: MatchConfirmedToFamilyInput) {
  return renderEmailText(familyBlocks(input));
}
export function matchConfirmedToFamilySubject(input: MatchConfirmedToFamilyInput) {
  return `Confirmed: matched with ${input.companionFirstName}  ·  ${brand.fullName}`;
}

export interface MatchConfirmedToCompanionInput {
  companionFirstName: string;
  familyBillingName: string;
  recipientFirstName: string;
  recipientPreferredName: string | null;
}

function companionBlocks(input: MatchConfirmedToCompanionInput): EmailBlocks {
  const name = input.recipientPreferredName || input.recipientFirstName;
  return {
    preheader: `Confirmed: matched with the ${input.familyBillingName} family.`,
    titleTag: `Confirmed - matched with ${input.familyBillingName}  ·  ${brand.fullName}`,
    heading: `Confirmed, ${input.companionFirstName}.`,
    italicSubline: `You are matched with ${input.familyBillingName}.`,
    lead: `Confirming the call. We have noted that you are happy to visit ${name}. We are setting up the schedule with the family now.`,
    dataRowsHeading: 'Who you will be visiting',
    dataRows: [
      { label: 'Family', value: input.familyBillingName },
      {
        label: 'Recipient',
        value: input.recipientPreferredName
          ? `${input.recipientFirstName} (known as ${input.recipientPreferredName})`
          : input.recipientFirstName,
      },
    ],
    nextSteps: [
      'We confirm the recurring schedule with you and the family, then send a separate booking confirmation email.',
      'The first visit address is in the booking confirmation, alongside any access notes the family asked us to pass on.',
      'After every visit you submit a short report within four hours; the family sees a redacted version.',
    ],
  };
}

export function matchConfirmedToCompanionHtml(input: MatchConfirmedToCompanionInput) {
  return renderEmailHtml(companionBlocks(input));
}
export function matchConfirmedToCompanionText(input: MatchConfirmedToCompanionInput) {
  return renderEmailText(companionBlocks(input));
}
export function matchConfirmedToCompanionSubject(input: MatchConfirmedToCompanionInput) {
  return `Confirmed: matched with ${input.familyBillingName}  ·  ${brand.fullName}`;
}
