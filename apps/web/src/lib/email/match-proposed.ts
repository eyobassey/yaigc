import { brand } from '@igc/content';
import {
  renderEmailHtml,
  renderEmailText,
  SITE_URL,
  type EmailBlocks,
} from './_chrome';

// Sent on Match status=proposed (not accepted). Two flavours, one
// per audience. Different from match-confirmed which fires on
// accepted - this is the 'we'd like to introduce X' email.

export interface MatchProposedToFamilyInput {
  recipientFirstName: string;
  recipientPreferredName: string | null;
  companionFirstName: string;
  companionLastName: string;
  companionBorough: string;
  companionBio: string | null;
  rationale: string;
  matchId: string;
}

function familyBlocks(input: MatchProposedToFamilyInput): EmailBlocks {
  const name = input.recipientPreferredName || input.recipientFirstName;
  return {
    preheader: `${input.companionFirstName} would visit ${name}. Have a look and let us know.`,
    titleTag: `A companion we have in mind  ·  ${brand.fullName}`,
    heading: 'A companion we have in mind.',
    italicSubline: `${input.companionFirstName} for ${name}.`,
    lead: `We have spent time finding someone we think will be a good fit for ${name}. Their profile is below. Sign in to your account to accept the match or let us know they are not the one - we will keep looking.`,
    dataRowsHeading: `About ${input.companionFirstName}`,
    dataRows: [
      { label: 'First name', value: input.companionFirstName },
      { label: 'Area', value: input.companionBorough.replace(/_/g, ' ') },
      ...(input.companionBio ? [{ label: 'A little about them', value: input.companionBio }] : []),
      { label: 'Why this match', value: input.rationale },
    ],
    nextSteps: [
      `Sign in and have a look at the full profile. The accept and decline buttons are right there.`,
      `If you accept, we set up the recurring rhythm. If not, we keep looking - no awkwardness.`,
    ],
    cta: {
      label: 'See the match',
      href: `${SITE_URL}/family/matches/${input.matchId}`,
      subline: 'We email you a one-time sign-in link, no password needed.',
    },
  };
}

export function matchProposedToFamilyHtml(input: MatchProposedToFamilyInput) {
  return renderEmailHtml(familyBlocks(input));
}
export function matchProposedToFamilyText(input: MatchProposedToFamilyInput) {
  return renderEmailText(familyBlocks(input));
}
export function matchProposedToFamilySubject(input: MatchProposedToFamilyInput) {
  return `${input.companionFirstName} - a companion we have in mind  ·  ${brand.fullName}`;
}

export interface MatchProposedToCompanionInput {
  companionFirstName: string;
  familyBillingName: string;
  recipientFirstName: string;
  recipientPreferredName: string | null;
  rationale: string;
  matchId: string;
}

function companionBlocks(input: MatchProposedToCompanionInput): EmailBlocks {
  const name = input.recipientPreferredName || input.recipientFirstName;
  return {
    preheader: `${input.familyBillingName} - have a look and let us know.`,
    titleTag: `A household we have in mind  ·  ${brand.fullName}`,
    heading: `A household we have in mind, ${input.companionFirstName}.`,
    italicSubline: `Visiting ${name}.`,
    lead: `We have a household in mind for you. Sign in to see what we know about ${name} and let us know if you are up for it.`,
    dataRowsHeading: 'About the visit',
    dataRows: [
      { label: 'Family', value: input.familyBillingName },
      { label: 'Recipient', value: name },
      { label: 'Why we thought of you', value: input.rationale },
    ],
    nextSteps: [
      'Sign in to see the full match. Accept and decline buttons are there.',
      'Address, phone and the rest only come through after both sides have agreed.',
    ],
    cta: {
      label: 'See the match',
      href: `${SITE_URL}/companion/matches/${input.matchId}`,
      subline: 'We email you a one-time sign-in link, no password needed.',
    },
  };
}

export function matchProposedToCompanionHtml(input: MatchProposedToCompanionInput) {
  return renderEmailHtml(companionBlocks(input));
}
export function matchProposedToCompanionText(input: MatchProposedToCompanionInput) {
  return renderEmailText(companionBlocks(input));
}
export function matchProposedToCompanionSubject(input: MatchProposedToCompanionInput) {
  return `A household for you to look at  ·  ${brand.fullName}`;
}
