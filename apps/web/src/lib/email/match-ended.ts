import { brand } from '@igc/content';
import {
  renderEmailHtml,
  renderEmailText,
  type EmailBlocks,
} from './_chrome';

// Sent when an operator ends an accepted match. Sent to all active
// family members and to the companion. The operator's free-text note is
// intentionally NOT included - it stays in the audit log only. If
// specific words need to be shared, the operator phones the parties.

// Reason label is shown to all parties. Safeguarding reason is softer.
const REASON_LABEL: Record<string, string> = {
  not_a_fit: 'The pairing was not the right fit',
  scheduling_conflict: 'Scheduling no longer works',
  recipient_circumstances_changed: "The recipient's circumstances have changed",
  recipient_passed_away: 'The recipient has passed away',
  companion_circumstances_changed: 'The companion is no longer available',
  safeguarding_concern: 'A safeguarding matter we are following up on',
  other: 'Personal circumstances',
};

export interface MatchEndedToFamilyInput {
  recipientFirstName: string;
  recipientPreferredName: string | null;
  companionFirstName: string;
  companionLastName: string;
  endReason: string;
  subscriptionCancelled: boolean;
}

function familyBlocks(input: MatchEndedToFamilyInput): EmailBlocks {
  const name = input.recipientPreferredName || input.recipientFirstName;
  const isSafeguarding = input.endReason === 'safeguarding_concern';
  const isPassedAway = input.endReason === 'recipient_passed_away';

  // Tone shifts per reason.
  const lead = isSafeguarding
    ? `We are writing to let you know we have ended the pairing between ${input.companionFirstName} ${input.companionLastName} and ${name}. We are following up on this separately and will be in touch.`
    : isPassedAway
    ? `We are so very sorry. We have ended the pairing between ${input.companionFirstName} ${input.companionLastName} and ${name}. Thinking of you.`
    : `We have ended the pairing between ${input.companionFirstName} ${input.companionLastName} and ${name}. Reason on file: ${REASON_LABEL[input.endReason] ?? input.endReason}.`;

  const nextSteps: string[] = [];
  if (input.subscriptionCancelled) {
    nextSteps.push('Your recurring booking has been cancelled. You will not be billed for any visits beyond today.');
  }
  if (!isSafeguarding && !isPassedAway) {
    nextSteps.push("If you would like us to look for another companion, reply to this email or call us. We will be glad to.");
  }
  if (isSafeguarding) {
    nextSteps.push('A member of our safeguarding team will contact you shortly.');
  }

  return {
    preheader: `We have ended the pairing with ${input.companionFirstName}.`,
    titleTag: `Pairing ended  ·  ${brand.fullName}`,
    heading: isPassedAway ? 'With sympathy.' : 'A note from us.',
    italicSubline: isSafeguarding
      ? 'We are looking into this.'
      : isPassedAway
      ? 'Thinking of you.'
      : 'The pairing has been ended.',
    lead,
    nextSteps: nextSteps.length ? nextSteps : undefined,
  };
}

export function matchEndedToFamilyHtml(input: MatchEndedToFamilyInput) {
  return renderEmailHtml(familyBlocks(input));
}
export function matchEndedToFamilyText(input: MatchEndedToFamilyInput) {
  return renderEmailText(familyBlocks(input));
}
export function matchEndedToFamilySubject() {
  return `A note from us  ·  ${brand.fullName}`;
}

export interface MatchEndedToCompanionInput {
  companionFirstName: string;
  familyBillingName: string;
  recipientFirstName: string;
  recipientPreferredName: string | null;
  endReason: string;
  subscriptionCancelled: boolean;
}

function companionBlocks(input: MatchEndedToCompanionInput): EmailBlocks {
  const name = input.recipientPreferredName || input.recipientFirstName;
  const isSafeguarding = input.endReason === 'safeguarding_concern';
  const isPassedAway = input.endReason === 'recipient_passed_away';

  const lead = isSafeguarding
    ? `We have ended your pairing with the ${input.familyBillingName} family. We are following up on a safeguarding matter and a member of our team will be in touch with you directly.`
    : isPassedAway
    ? `We are so sorry to share that ${name} has passed away. Thank you for the time you spent together. We have ended the pairing.`
    : `We have ended your pairing with the ${input.familyBillingName} family. Reason on file: ${REASON_LABEL[input.endReason] ?? input.endReason}.`;

  const nextSteps: string[] = [];
  if (input.subscriptionCancelled) {
    nextSteps.push('The recurring booking is cancelled. You will not see further scheduled visits with this family.');
  }
  if (isSafeguarding) {
    nextSteps.push('A member of our safeguarding team will call you. Please answer when we ring.');
  } else if (!isPassedAway) {
    nextSteps.push('Your other bookings are unaffected. We will continue to match you with new families.');
  }

  return {
    preheader: `Your pairing with ${input.familyBillingName} has ended.`,
    titleTag: `Pairing ended  ·  ${brand.fullName}`,
    heading: isPassedAway ? `Sad news, ${input.companionFirstName}.` : `A note from us, ${input.companionFirstName}.`,
    italicSubline: isSafeguarding
      ? 'We will be in touch.'
      : isPassedAway
      ? 'Thinking of you.'
      : 'The pairing has been ended.',
    lead,
    nextSteps: nextSteps.length ? nextSteps : undefined,
  };
}

export function matchEndedToCompanionHtml(input: MatchEndedToCompanionInput) {
  return renderEmailHtml(companionBlocks(input));
}
export function matchEndedToCompanionText(input: MatchEndedToCompanionInput) {
  return renderEmailText(companionBlocks(input));
}
export function matchEndedToCompanionSubject() {
  return `A note from us  ·  ${brand.fullName}`;
}
