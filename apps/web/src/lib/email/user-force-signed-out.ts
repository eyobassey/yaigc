import { brand } from '@igc/content';
import {
  renderEmailHtml,
  renderEmailText,
  SITE_URL,
  type EmailBlocks,
} from './_chrome';

// Sent when an operator force-revokes every active session for a user.
// We don't include the operator's reason - it can be sensitive
// operational context. The user can ring the office if they need
// detail.

export interface UserForceSignedOutInput {
  firstName: string | null;
}

function blocks(input: UserForceSignedOutInput): EmailBlocks {
  const name = input.firstName ?? 'there';
  return {
    preheader: `You have been signed out of all devices on ${brand.fullName}.`,
    titleTag: `Signed out of all devices  ·  ${brand.fullName}`,
    heading: `Quick heads-up, ${name}.`,
    italicSubline: `Signed out of every device.`,
    lead: `Someone at ${brand.fullName} signed you out of all devices on the platform. You will need to sign in again from each one. If this was unexpected, give the office a ring.`,
    cta: {
      label: 'Sign in',
      href: `${SITE_URL}/sign-in`,
      subline: 'Password, passkey, or a one-time link - your choice.',
    },
  };
}

export function userForceSignedOutHtml(input: UserForceSignedOutInput) {
  return renderEmailHtml(blocks(input));
}
export function userForceSignedOutText(input: UserForceSignedOutInput) {
  return renderEmailText(blocks(input));
}
export function userForceSignedOutSubject() {
  return `You were signed out of all devices  ·  ${brand.fullName}`;
}
