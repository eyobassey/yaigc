import { brand } from '@igc/content';
import {
  renderEmailHtml,
  renderEmailText,
  type EmailBlocks,
} from './_chrome';

// R.5 - "Reflection note" email sent to the family payer after the
// operator logs a fifth-visit reflection call or a periodic check-in.
//
// Voice rules from the design memo, section 6.3:
//   warm, unhurried, curious, not clinical, not procedural.
//
// Specifically NOT used:
//   - "Your fifth-visit check-in is complete" (procedural)
//   - "Customer satisfaction summary" (corporate)
//   - "Outcomes recorded" (regulated-care language - section 6.2)
//
// The body of the email is the operator's note verbatim. We do not
// summarise, we do not rate, we do not attach a score. The note
// already arrived warm; we ship it as-is.

export interface RelationshipNoteEmailInput {
  recipientFirstName: string | null;
  operatorFirstName: string | null;
  noteBody: string;
  noteKind: 'fifth_visit' | 'check_in' | 'other';
}

function preheaderOf(body: string): string {
  const single = body.replace(/\s+/g, ' ').trim();
  return single.length > 110 ? `${single.slice(0, 109)}…` : single;
}

function blocks(input: RelationshipNoteEmailInput): EmailBlocks {
  const name = input.recipientFirstName ?? 'there';
  const operator = input.operatorFirstName ?? 'the team';
  return {
    preheader: preheaderOf(input.noteBody),
    titleTag: `Notes from our chat  ·  ${brand.fullName}`,
    heading: `A note for you, ${name}.`,
    italicSubline: `From ${operator} at the office.`,
    lead: input.noteBody,
  };
}

export function relationshipNoteHtml(input: RelationshipNoteEmailInput) {
  return renderEmailHtml(blocks(input));
}
export function relationshipNoteText(input: RelationshipNoteEmailInput) {
  return renderEmailText(blocks(input));
}
export function relationshipNoteSubject(_input: RelationshipNoteEmailInput) {
  return `Notes from our chat  ·  ${brand.fullName}`;
}
