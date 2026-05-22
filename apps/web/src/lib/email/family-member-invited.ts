import { brand } from '@igc/content';
import {
  renderEmailHtml,
  renderEmailText,
  SITE_URL,
  type EmailBlocks,
} from './_chrome';

// Sent when a family payer invites another household member to the
// account. Recipient signs in via the standard magic-link flow at
// /sign-in (no separate accept-invite endpoint - the FamilyMember row
// is the access grant; the email is a heads-up + sign-in nudge).

export interface FamilyMemberInvitedInput {
  inviteeFirstName: string;
  inviterFirstName: string;
  familyBillingName: string;
  recipientFirstName: string;
}

function blocks(input: FamilyMemberInvitedInput): EmailBlocks {
  return {
    preheader: `${input.inviterFirstName} has added you to the ${brand.fullName} account for ${input.familyBillingName}.`,
    titleTag: `You have been added to the account  ·  ${brand.fullName}`,
    heading: `${input.inviterFirstName} has added you.`,
    italicSubline: `You can see what we know.`,
    lead: `${input.inviterFirstName} has added you to the ${brand.fullName} account for ${input.familyBillingName}. You can now see visit notes and the recurring schedule for ${input.recipientFirstName}.`,
    dataRowsHeading: 'What you can do',
    dataRows: [
      { label: 'See', value: `Upcoming and past visits, with the short notes ${input.recipientFirstName}'s companion sends after each one.` },
      { label: 'See', value: `Who has been matched as the companion, and a little about them.` },
      { label: 'Cannot', value: 'Change consents, address, or the recurring schedule - those stay with the payer. Get in touch if you need a hand.' },
    ],
    nextSteps: [
      `Sign in at the link below. We will email you a one-time code, no password.`,
      `Have a look around. Reply to this email if anything looks off.`,
    ],
    cta: {
      label: 'Sign in',
      href: `${SITE_URL}/sign-in?callbackUrl=/family`,
      subline: 'We email you a one-time sign-in link, no password needed.',
    },
  };
}

export function familyMemberInvitedHtml(input: FamilyMemberInvitedInput) {
  return renderEmailHtml(blocks(input));
}
export function familyMemberInvitedText(input: FamilyMemberInvitedInput) {
  return renderEmailText(blocks(input));
}
export function familyMemberInvitedSubject(input: FamilyMemberInvitedInput) {
  return `You have been added to the ${input.familyBillingName} account  ·  ${brand.fullName}`;
}
