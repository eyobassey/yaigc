'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useEffect, useRef, useState } from 'react';
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
  currentUserId: string;
  messages: MessageRow[];
}

export function ThreadView({
  threadId,
  otherPartyLabel,
  currentUserId,
  messages: initialMessages,
}: Props) {
  const [state, action] = useFormState(sendMessage, initial);
  const [live, setLive] = useState<MessageRow[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Merge server-rendered + live by id.
  const seen = new Set(initialMessages.map((m) => m.id));
  const merged = [...initialMessages, ...live.filter((m) => !seen.has(m.id))];

  useEffect(() => {
    if (state.ok && formRef.current) {
      formRef.current.reset();
    }
  }, [state.ok]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [merged.length]);

  // One WebSocket per ThreadView mount. Filters envelopes to this
  // thread. Backs off and reconnects on close.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let ws: WebSocket | null = null;
    let closed = false;
    let retryMs = 1000;
    const wsUrl = `${
      window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    }//${window.location.host}/realtime/messaging`;

    function connect() {
      if (closed) return;
      try {
        ws = new WebSocket(wsUrl);
      } catch {
        return;
      }
      ws.addEventListener('open', () => {
        retryMs = 1000;
      });
      ws.addEventListener('message', (ev) => {
        try {
          const env = JSON.parse(String(ev.data));
          if (
            env &&
            env.kind === 'message' &&
            env.threadId === threadId &&
            env.message?.id
          ) {
            const m = env.message;
            setLive((prev) =>
              prev.some((x) => x.id === m.id)
                ? prev
                : [
                    ...prev,
                    {
                      id: m.id,
                      body: m.body,
                      createdAt: m.createdAt,
                      fromCurrentUser: m.senderId === currentUserId,
                      senderLabel:
                        m.senderId === currentUserId ? 'You' : otherPartyLabel,
                    },
                  ],
            );
          }
        } catch {
          /* ignore malformed payload */
        }
      });
      ws.addEventListener('close', () => {
        if (closed) return;
        retryMs = Math.min(30_000, retryMs * 2);
        setTimeout(connect, retryMs);
      });
    }

    connect();
    return () => {
      closed = true;
      try {
        ws?.close();
      } catch {
        /* swallow */
      }
    };
  }, [threadId, currentUserId, otherPartyLabel]);

  return (
    <div className="flex flex-col gap-4">
      <ul
        ref={listRef}
        className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto bg-cream rounded-md border border-moss/10 p-3 sm:p-4"
      >
        {merged.length === 0 ? (
          <li className="text-stone text-[0.9375rem] italic text-center py-6">
            No messages yet.
          </li>
        ) : (
          merged.map((m) => (
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
