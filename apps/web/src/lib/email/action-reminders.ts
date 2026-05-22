import { brand } from '@igc/content';
import {
  renderEmailHtml,
  renderEmailText,
  SITE_URL,
  type EmailBlocks,
} from './_chrome';
import { formatUkDateTime } from '@/lib/visit-schedule';

// Four single-shot action-reminder emails fired by the
// /api/cron/action-reminders endpoint. Each one nudges a specific
// party about a specific outstanding action; the cron sets the
// corresponding *ReminderSentAt column so the nudge only goes once.

// =============================================================
// MATCH REMINDER: family payer has not responded after 24h
// =============================================================

export interface MatchReminderToFamilyInput {
  recipientFirstName: string;
  recipientPreferredName: string | null;
  companionFirstName: string;
  matchId: string;
}

function matchReminderFamilyBlocks(
  input: MatchReminderToFamilyInput,
): EmailBlocks {
  const name = input.recipientPreferredName || input.recipientFirstName;
  return {
    preheader: `Just a nudge - ${input.companionFirstName} is awaiting your reply.`,
    titleTag: `Just a nudge  ·  ${brand.fullName}`,
    heading: 'Have you had a chance to look?',
    italicSubline: `${input.companionFirstName} for ${name}.`,
    lead: `We proposed ${input.companionFirstName} as a companion for ${name} yesterday. No rush, but a quick yes or no helps us either set the booking up or look for someone else.`,
    cta: {
      label: 'See the match',
      href: `${SITE_URL}/family/matches/${input.matchId}`,
      subline: 'Sign in with a one-time link, no password needed.',
    },
  };
}

export function matchReminderToFamilyHtml(input: MatchReminderToFamilyInput) {
  return renderEmailHtml(matchReminderFamilyBlocks(input));
}
export function matchReminderToFamilyText(input: MatchReminderToFamilyInput) {
  return renderEmailText(matchReminderFamilyBlocks(input));
}
export function matchReminderToFamilySubject() {
  return `A nudge - your match is awaiting a reply  ·  ${brand.fullName}`;
}

// =============================================================
// MATCH REMINDER: companion has not responded after 24h
// =============================================================

export interface MatchReminderToCompanionInput {
  companionFirstName: string;
  familyBillingName: string;
  recipientFirstName: string;
  recipientPreferredName: string | null;
  matchId: string;
}

function matchReminderCompanionBlocks(
  input: MatchReminderToCompanionInput,
): EmailBlocks {
  const name = input.recipientPreferredName || input.recipientFirstName;
  return {
    preheader: `${input.familyBillingName} - we are waiting to hear from you.`,
    titleTag: `Just a nudge  ·  ${brand.fullName}`,
    heading: `Just a nudge, ${input.companionFirstName}.`,
    italicSubline: `${input.familyBillingName} for ${name}.`,
    lead: `We proposed this household to you yesterday. Have a look when you can and let us know - either way is fine, we just need to know which.`,
    cta: {
      label: 'See the match',
      href: `${SITE_URL}/companion/matches/${input.matchId}`,
      subline: 'Sign in with a one-time link, no password needed.',
    },
  };
}

export function matchReminderToCompanionHtml(
  input: MatchReminderToCompanionInput,
) {
  return renderEmailHtml(matchReminderCompanionBlocks(input));
}
export function matchReminderToCompanionText(
  input: MatchReminderToCompanionInput,
) {
  return renderEmailText(matchReminderCompanionBlocks(input));
}
export function matchReminderToCompanionSubject() {
  return `A nudge - a household awaiting your reply  ·  ${brand.fullName}`;
}

// =============================================================
// VISIT CONFIRMATION REMINDER: companion has not confirmed ~4h out
// =============================================================

export interface VisitConfirmationReminderInput {
  companionFirstName: string;
  recipientFirstName: string;
  recipientPreferredName: string | null;
  scheduledStartAt: Date;
  visitId: string;
}

function visitConfirmationBlocks(
  input: VisitConfirmationReminderInput,
): EmailBlocks {
  const name = input.recipientPreferredName || input.recipientFirstName;
  return {
    preheader: `${formatUkDateTime(input.scheduledStartAt)} - please confirm.`,
    titleTag: `Please confirm your visit  ·  ${brand.fullName}`,
    heading: `Confirm your visit, ${input.companionFirstName}.`,
    italicSubline: `${formatUkDateTime(input.scheduledStartAt)}.`,
    lead: `Your visit to ${name} is coming up. Quick tap to confirm so the family knows you are on your way - they get a reassurance email at the same time.`,
    cta: {
      label: 'Confirm the visit',
      href: `${SITE_URL}/companion/visits/${input.visitId}`,
      subline: 'Sign in with a one-time link, no password needed.',
    },
  };
}

export function visitConfirmationReminderHtml(
  input: VisitConfirmationReminderInput,
) {
  return renderEmailHtml(visitConfirmationBlocks(input));
}
export function visitConfirmationReminderText(
  input: VisitConfirmationReminderInput,
) {
  return renderEmailText(visitConfirmationBlocks(input));
}
export function visitConfirmationReminderSubject(
  input: VisitConfirmationReminderInput,
) {
  return `Confirm: visit at ${formatUkDateTime(input.scheduledStartAt)}  ·  ${brand.fullName}`;
}

// =============================================================
// REPORT OVERDUE REMINDER: visit completed >4h ago, no report
// =============================================================

export interface ReportOverdueReminderInput {
  companionFirstName: string;
  recipientFirstName: string;
  recipientPreferredName: string | null;
  scheduledStartAt: Date;
  visitId: string;
}

function reportOverdueBlocks(
  input: ReportOverdueReminderInput,
): EmailBlocks {
  const name = input.recipientPreferredName || input.recipientFirstName;
  return {
    preheader: `Your note about ${name} is overdue.`,
    titleTag: `How did the visit go?  ·  ${brand.fullName}`,
    heading: `How did it go, ${input.companionFirstName}?`,
    italicSubline: `Visit to ${name} on ${formatUkDateTime(input.scheduledStartAt)}.`,
    lead: `We have not seen your note yet. Family is expecting it - even a few sentences makes a difference. If something held you up or you would rather phone it in, just ring us.`,
    cta: {
      label: 'Submit your note',
      href: `${SITE_URL}/companion/visits/${input.visitId}/report`,
      subline: 'Sign in with a one-time link, no password needed.',
    },
  };
}

export function reportOverdueReminderHtml(input: ReportOverdueReminderInput) {
  return renderEmailHtml(reportOverdueBlocks(input));
}
export function reportOverdueReminderText(input: ReportOverdueReminderInput) {
  return renderEmailText(reportOverdueBlocks(input));
}
export function reportOverdueReminderSubject(
  input: ReportOverdueReminderInput,
) {
  const name = input.recipientPreferredName || input.recipientFirstName;
  return `Your note about ${name} is overdue  ·  ${brand.fullName}`;
}
