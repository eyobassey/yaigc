import { brand } from '@igc/content';
import {
  renderEmailHtml,
  renderEmailText,
  SITE_URL,
  type EmailBlocks,
} from './_chrome';

const ROLE_LABEL: Record<string, string> = {
  family_payer: 'Family payer',
  family_viewer: 'Family viewer',
  companion: 'Companion',
  operator_coordinator: 'Coordinator',
  operator_safeguarding: 'Safeguarding lead',
  operator_finance: 'Finance',
  operator_admin: 'Admin',
  operator_read_only: 'Read-only',
};

function label(role: string): string {
  return ROLE_LABEL[role] ?? role;
}

export interface UserRoleChangedInput {
  firstName: string | null;
  beforeRole: string;
  afterRole: string;
}

function blocks(input: UserRoleChangedInput): EmailBlocks {
  const name = input.firstName ?? 'there';
  return {
    preheader: `Your role at ${brand.fullName} has been updated.`,
    titleTag: `Role update  ·  ${brand.fullName}`,
    heading: `A quick update, ${name}.`,
    italicSubline: `Your role on the platform has changed.`,
    lead: `Someone at ${brand.fullName} updated your role from ${label(input.beforeRole)} to ${label(input.afterRole)}. If this was unexpected, give the office a ring and we will look into it.`,
    cta: {
      label: 'Open your account',
      href: `${SITE_URL}/me`,
      subline: 'Sign in with a one-time link, password, or passkey.',
    },
  };
}

export function userRoleChangedHtml(input: UserRoleChangedInput) {
  return renderEmailHtml(blocks(input));
}
export function userRoleChangedText(input: UserRoleChangedInput) {
  return renderEmailText(blocks(input));
}
export function userRoleChangedSubject() {
  return `Your role at ${brand.fullName} has been updated`;
}
