'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useEffect, useRef } from 'react';
import { sendMessage, type SendMessageState } from '@/lib/messaging';

const initial: SendMessageState = { ok: false };

interface MessageRow {
  id: string;
  body: string;
  createdAt: string;
  fromCurrentUser: boolean;
  senderLabel: string;
}

interface Props {
  threadId: string;
  otherPartyLabel: string;
  messages: MessageRow[];
}

export function ThreadView({ threadId, otherPartyLabel, messages }: Props) {
  const [state, action] = useFormState(sendMessage, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Clear the textarea after a successful send.
  useEffect(() => {
    if (state.ok && formRef.current) {
      formRef.current.reset();
    }
  }, [state.ok]);

  // Scroll the message list to the bottom on mount + when messages change.
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages.length]);

  return (
    <div className="flex flex-col gap-4">
      <ul
        ref={listRef}
        className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto bg-cream rounded-md border border-moss/10 p-3 sm:p-4"
      >
        {messages.length === 0 ? (
          <li className="text-stone text-[0.9375rem] italic text-center py-6">
            No messages yet.
          </li>
        ) : (
          messages.map((m) => (
            <li
              key={m.id}
              className={`flex flex-col gap-1 max-w-[80%] ${
                m.fromCurrentUser ? 'self-end items-end' : 'self-start items-start'
              }`}
            >
              <div
                className={`rounded-lg px-3 py-2 text-[0.9375rem] leading-[1.5] whitespace-pre-wrap break-words ${
                  m.fromCurrentUser
                    ? 'bg-moss text-cream'
                    : 'bg-paper text-charcoal border border-moss/10'
                }`}
              >
                {m.body}
              </div>
              <span className="text-stone text-[0.7rem] font-mono">
                {m.senderLabel} · {new Date(m.createdAt).toLocaleString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'Europe/London',
                })}
              </span>
            </li>
          ))
        )}
      </ul>

      <form
        ref={formRef}
        action={action}
        className="flex flex-col gap-2"
        noValidate
      >
        <input type="hidden" name="threadId" value={threadId} />
        <label className="sr-only" htmlFor={`body-${threadId}`}>
          Message to {otherPartyLabel}
        </label>
        <textarea
          id={`body-${threadId}`}
          name="body"
          required
          rows={3}
          maxLength={4000}
          placeholder={`Reply to ${otherPartyLabel}…`}
          className="bg-paper border border-moss/15 rounded-md px-3 py-2 text-charcoal focus:outline-none focus:ring-2 focus:ring-moss/25 focus:border-moss/40 resize-y"
        />
        {state.error ? (
          <p className="text-terracotta text-[0.8125rem]">{state.error}</p>
        ) : null}
        <SubmitButton />
      </form>
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="self-end inline-flex items-center justify-center font-body text-[0.875rem] text-paper bg-moss hover:bg-moss-deep disabled:opacity-60 rounded-full px-5 py-2 transition-colors"
    >
      {pending ? 'Sending…' : 'Send'}
    </button>
  );
}
