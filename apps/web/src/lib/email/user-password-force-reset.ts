import { brand } from '@igc/content';
import {
  renderEmailHtml,
  renderEmailText,
  SITE_URL,
  type EmailBlocks,
} from './_chrome';

// Sent when an operator clears a user's password and revokes their
// sessions. The user signs back in via a one-time link, then sets a
// new password from their account page.

export interface UserPasswordForceResetInput {
  firstName: string | null;
}

function blocks(input: UserPasswordForceResetInput): EmailBlocks {
  const name = input.firstName ?? 'there';
  return {
    preheader: `Your password has been reset.`,
    titleTag: `Password reset  ·  ${brand.fullName}`,
    heading: `Your password was reset, ${name}.`,
    italicSubline: `Get back in with a one-time link.`,
    lead: `An operator at ${brand.fullName} reset your password. To get back in, head to the sign-in page and pick "Email me a one-time link". Once signed in, set a new password from your account security page. If this was unexpected, ring the office.`,
    cta: {
      label: 'Sign in',
      href: `${SITE_URL}/sign-in`,
      subline: 'Pick "Email me a one-time link" to get back in.',
    },
  };
}

export function userPasswordForceResetHtml(input: UserPasswordForceResetInput) {
  return renderEmailHtml(blocks(input));
}
export function userPasswordForceResetText(input: UserPasswordForceResetInput) {
  return renderEmailText(blocks(input));
}
export function userPasswordForceResetSubject() {
  return `Your password has been reset  ·  ${brand.fullName}`;
}
