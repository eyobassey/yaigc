import { brand } from '@igc/content';
import {
  renderEmailHtml,
  renderEmailText,
  SITE_URL,
  type EmailBlocks,
} from './_chrome';

// Sent to operator_admin users when a SafeguardingCase opens (auto or
// manual). Brief - the goal is to nudge the recipient into the
// operator console where the full context lives. Never sent to family
// or companion; safeguarding correspondence stays internal.

const SEVERITY_LABEL: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

const TRIGGER_LABEL: Record<string, string> = {
  pvr_things_to_flag: "From a companion's post-visit report",
  match_ended_safeguarding: 'From an ended match (safeguarding reason)',
  manual: 'Opened manually by an operator',
};

export interface SafeguardingCaseOpenedInput {
  caseId: string;
  severity: string;
  trigger: string;
  summary: string;
  subjectRecipientName: string | null;
  openedByLabel: string;
}

function blocks(input: SafeguardingCaseOpenedInput): EmailBlocks {
  return {
    preheader: `Safeguarding case opened (${SEVERITY_LABEL[input.severity] ?? input.severity}).`,
    titleTag: `Safeguarding case opened  ·  ${brand.fullName}`,
    heading: 'A case has opened.',
    italicSubline: `${SEVERITY_LABEL[input.severity] ?? input.severity} severity.`,
    lead: `A safeguarding case has just been opened. Please pick it up in the operator console - context, related visit or report, and the case-note thread all live there.`,
    dataRowsHeading: 'The case',
    dataRows: [
      { label: 'Severity', value: SEVERITY_LABEL[input.severity] ?? input.severity },
      { label: 'Trigger', value: TRIGGER_LABEL[input.trigger] ?? input.trigger },
      ...(input.subjectRecipientName
        ? [{ label: 'Subject', value: input.subjectRecipientName }]
        : []),
      { label: 'Opened by', value: input.openedByLabel },
      { label: 'Summary', value: input.summary },
    ],
    cta: {
      label: 'Open the case',
      href: `https://ops.youareingoodcompany.co.uk/ops/safeguarding/${input.caseId}`,
      subline: 'Sign-in link arrives by email if you are not already in session.',
    },
  };
}

export function safeguardingCaseOpenedHtml(input: SafeguardingCaseOpenedInput) {
  return renderEmailHtml(blocks(input));
}
export function safeguardingCaseOpenedText(input: SafeguardingCaseOpenedInput) {
  return renderEmailText(blocks(input));
}
export function safeguardingCaseOpenedSubject(input: SafeguardingCaseOpenedInput) {
  return `Safeguarding case opened (${SEVERITY_LABEL[input.severity] ?? input.severity})  ·  ${brand.fullName}`;
}
