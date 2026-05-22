import { brand } from '@igc/content';
import {
  renderEmailHtml,
  renderEmailText,
  SITE_URL,
  type EmailBlocks,
} from './_chrome';

// Sent when an operator soft-deletes a user account. Soft-delete keeps
// the record in the database (audit trail) but blocks sign-in. We
// surface a phone-first contact path because anything they want to
// say at this point needs a human.

export interface UserSoftDeletedInput {
  firstName: string | null;
}

function blocks(input: UserSoftDeletedInput): EmailBlocks {
  const name = input.firstName ?? 'there';
  return {
    preheader: `Your ${brand.fullName} account has been closed.`,
    titleTag: `Account closed  ·  ${brand.fullName}`,
    heading: `An update on your account, ${name}.`,
    italicSubline: `Account closed.`,
    lead: `Your ${brand.fullName} account has been closed. You will no longer be able to sign in. If this was unexpected or you would like to talk it through, please ring the office.`,
    cta: {
      label: 'Get in touch',
      href: `${SITE_URL}/contact`,
      subline: 'We will get back to you within one working day.',
    },
  };
}

export function userSoftDeletedHtml(input: UserSoftDeletedInput) {
  return renderEmailHtml(blocks(input));
}
export function userSoftDeletedText(input: UserSoftDeletedInput) {
  return renderEmailText(blocks(input));
}
export function userSoftDeletedSubject() {
  return `Your ${brand.fullName} account has been closed`;
}
