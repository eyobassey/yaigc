import { brand } from '@igc/content';
import {
  renderEmailHtml,
  renderEmailText,
  type EmailBlocks,
} from './_chrome';

// Sent to family members the moment the operator marks a visit as
// in_progress. A brief reassurance that the visit is happening - the
// fuller post-visit report follows after.

export interface VisitStartedToFamilyInput {
  recipientFirstName: string;
  recipientPreferredName: string | null;
  companionFirstName: string;
}

function blocks(input: VisitStartedToFamilyInput): EmailBlocks {
  const name = input.recipientPreferredName || input.recipientFirstName;
  return {
    preheader: `${input.companionFirstName} has arrived to visit ${name}.`,
    titleTag: `Visit has started  ·  ${brand.fullName}`,
    heading: 'Visit has started.',
    italicSubline: `${input.companionFirstName} is with ${name}.`,
    lead: `Just a quick note: ${input.companionFirstName} has arrived for the visit. We will send a fuller note within four hours of the visit ending.`,
  };
}

export function visitStartedToFamilyHtml(input: VisitStartedToFamilyInput) {
  return renderEmailHtml(blocks(input));
}
export function visitStartedToFamilyText(input: VisitStartedToFamilyInput) {
  return renderEmailText(blocks(input));
}
export function visitStartedToFamilySubject(input: VisitStartedToFamilyInput) {
  const name = input.recipientPreferredName || input.recipientFirstName;
  return `${input.companionFirstName} has arrived to visit ${name}  ·  ${brand.fullName}`;
}
