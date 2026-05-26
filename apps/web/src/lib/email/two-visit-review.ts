import { brand } from '@igc/content';
import {
  renderEmailHtml,
  renderEmailText,
  type EmailBlocks,
} from './_chrome';

// SDD Addendum §4. After the two-visit calibration review the
// operator sends a short note to both sides "in language appropriate
// to each." Two audiences, three outcomes (continue / adjust / reset),
// one body verbatim from the operator.
//
// Voice rules from the design memo, section 6.3: warm, unhurried.
// Explicitly NOT used:
//   - "Calibration review outcome recorded" (procedural)
//   - "Match status: continue" (clinical / regulated-care)
//   - "Reset" never appears as a verb in the family-facing email -
//     the operator phones first when the outcome is reset; the email
//     follows that conversation with the agreed framing.

type Outcome = 'continue' | 'adjust' | 'reset';

export interface TwoVisitReviewEmailInput {
  audience: 'family' | 'companion';
  recipientFirstName: string | null;
  operatorFirstName: string | null;
  outcome: Outcome;
  noteBody: string;
}

function preheaderOf(body: string): string {
  const single = body.replace(/\s+/g, ' ').trim();
  return single.length > 110 ? `${single.slice(0, 109)}…` : single;
}

function heading(input: TwoVisitReviewEmailInput): string {
  const name = input.recipientFirstName ?? 'there';
  return `After our first two visits, ${name}.`;
}

function italicSubline(input: TwoVisitReviewEmailInput): string {
  const operator = input.operatorFirstName ?? 'the team';
  if (input.audience === 'family') {
    return `A short note from ${operator} at the office.`;
  }
  return `A short note from ${operator} at the office.`;
}

function blocks(input: TwoVisitReviewEmailInput): EmailBlocks {
  return {
    preheader: preheaderOf(input.noteBody),
    titleTag: `After our first two visits  ·  ${brand.fullName}`,
    heading: heading(input),
    italicSubline: italicSubline(input),
    lead: input.noteBody,
  };
}

export function twoVisitReviewHtml(input: TwoVisitReviewEmailInput) {
  return renderEmailHtml(blocks(input));
}
export function twoVisitReviewText(input: TwoVisitReviewEmailInput) {
  return renderEmailText(blocks(input));
}
export function twoVisitReviewSubject(_input: TwoVisitReviewEmailInput) {
  return `After our first two visits  ·  ${brand.fullName}`;
}
