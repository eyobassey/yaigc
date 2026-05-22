import { brand } from '@igc/content';
import {
  renderEmailHtml,
  renderEmailText,
  SITE_URL,
  type EmailBlocks,
} from './_chrome';

// Sent when a new message lands in a thread. The 5-minute debounce
// lives in lib/messaging.ts (we only send if the recipient hasn't
// been notified about this thread in the last 5 minutes).

export interface NewMessageInput {
  recipientFirstName: string | null;
  recipientRoleHint: 'family' | 'companion' | 'operator';
  threadId: string;
  preview: string; // first ~120 chars of the message body
  fromOperator: boolean;
}

function blocks(input: NewMessageInput): EmailBlocks {
  const name = input.recipientFirstName ?? 'there';
  const portal =
    input.recipientRoleHint === 'family'
      ? '/family/messages'
      : input.recipientRoleHint === 'companion'
      ? '/companion/messages'
      : '/ops/messages';
  const url = `${SITE_URL}${portal}/${input.threadId}`;
  return {
    preheader: input.preview,
    titleTag: `New message  ·  ${brand.fullName}`,
    heading: `A message for you, ${name}.`,
    italicSubline: input.fromOperator
      ? `From the office.`
      : `A reply on your thread.`,
    lead: input.preview,
    cta: {
      label: 'Open the thread',
      href: url,
      subline: 'Sign in to reply.',
    },
  };
}

export function newMessageHtml(input: NewMessageInput) {
  return renderEmailHtml(blocks(input));
}
export function newMessageText(input: NewMessageInput) {
  return renderEmailText(blocks(input));
}
export function newMessageSubject(input: NewMessageInput) {
  return `New message  ·  ${brand.fullName}`;
}
