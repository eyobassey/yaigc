'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useEffect, useRef, useState } from 'react';
import {
  Paperclip,
  Smile,
  X,
  FileText,
  Download,
  Loader2,
  Trash2,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import {
  sendMessage,
  deleteMessage,
  type SendMessageState,
} from '@/lib/messaging';

// M.3 - sender-side delete window, mirrored from
// lib/messaging.ts:DELETE_WINDOW_MS. Used to hide the delete button
// on stale bubbles; the server re-checks on every call anyway.
const DELETE_WINDOW_MS = 15 * 60 * 1000;

// emoji-picker-react ships a fairly heavy bundle. Load it on demand
// the first time the user opens the picker so the initial thread render
// stays snappy.
const EmojiPicker = dynamic(() => import('emoji-picker-react'), {
  ssr: false,
  loading: () => (
    <div className="text-stone text-[0.8125rem] p-4">Loading…</div>
  ),
});

const initial: SendMessageState = { ok: false };

// Per M.1.2 scoping.
const MAX_ATTACHMENTS = 5;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const MAX_TOTAL_BYTES = 100 * 1024 * 1024;

// Mirrors the server whitelist; the input[type=file] accept attribute
// is generated from these keys.
const ACCEPT = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'video/mp4',
  'video/quicktime',
  'video/webm',
].join(',');

export interface MessageAttachmentRow {
  id: string;
  contentType: string;
  sizeBytes: number;
  width?: number | null;
  height?: number | null;
  originalFilename?: string | null;
}

interface MessageRow {
  id: string;
  body: string;
  createdAt: string;
  fromCurrentUser: boolean;
  senderLabel: string;
  attachments?: MessageAttachmentRow[];
  // M.3: when set, this message was soft-deleted by its sender.
  // Counterparts render a "Message deleted" tombstone; the sender
  // sees "(deleted by you)". ops_admin on a direct thread gets
  // special treatment in M.3.4 to see the original body.
  deletedAt?: string | null;
}

interface PendingAttachment {
  // localId is a UUID-ish key used by the composer before the upload
  // finishes; once uploaded, serverId holds the MessageAttachment id.
  localId: string;
  file: File;
  status: 'uploading' | 'ready' | 'error';
  serverId?: string;
  error?: string;
  contentType: string;
  sizeBytes: number;
  previewUrl?: string;
}

interface Props {
  threadId: string;
  otherPartyLabel: string;
  currentUserId: string;
  messages: MessageRow[];
  // M.2.4: ops oversight surface. When true, render the messages
  // (incl. live WS updates) but hide the composer entirely. The
  // ops_admin role uses this to monitor direct threads without
  // posting into them.
  readOnly?: boolean;
  // M.3.4: when true, deleted messages still show their original
  // body with a strike-through + "[deleted by sender]" marker
  // instead of the tombstone. Only used by operator_admins on the
  // FAMILY_COMPANION oversight surface; gives safeguarding full
  // recovery of deleted content alongside the audit log.
  revealDeleted?: boolean;
}

export function ThreadView({
  threadId,
  otherPartyLabel,
  currentUserId,
  messages: initialMessages,
  readOnly = false,
  revealDeleted = false,
}: Props) {
  const [state, action] = useFormState(sendMessage, initial);
  const [live, setLive] = useState<MessageRow[]>([]);
  const [pending, setPending] = useState<PendingAttachment[]>([]);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);
  // M.3: ids that were soft-deleted at runtime (via WS or the local
  // delete action). Wins over the server-provided deletedAt so the
  // tombstone applies without a refresh.
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const formRef = useRef<HTMLFormElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const seen = new Set(initialMessages.map((m) => m.id));
  const merged = [...initialMessages, ...live.filter((m) => !seen.has(m.id))];

  // Reset the form + clear pending uploads once the server action
  // confirms the message was sent.
  useEffect(() => {
    if (state.ok && formRef.current) {
      formRef.current.reset();
      // Revoke object URLs we created for the local previews.
      for (const p of pending) {
        if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
      }
      setPending([]);
      setEmojiOpen(false);
    }
    // We intentionally only react to state.ok flipping true.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [merged.length]);

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
                      attachments: Array.isArray(m.attachments)
                        ? m.attachments
                        : [],
                    },
                  ],
            );
          } else if (
            env &&
            env.kind === 'message-deleted' &&
            env.threadId === threadId &&
            typeof env.messageId === 'string'
          ) {
            // M.3.2 envelope: mark the bubble as deleted in place.
            const id: string = env.messageId;
            setDeletedIds((prev) => {
              if (prev.has(id)) return prev;
              const next = new Set(prev);
              next.add(id);
              return next;
            });
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

  function validateBeforeUpload(file: File): string | null {
    if (!ACCEPT.split(',').includes(file.type)) {
      return `Unsupported type ${file.type || '(unknown)'}.`;
    }
    let limit = MAX_DOCUMENT_BYTES;
    if (file.type.startsWith('image/')) limit = MAX_IMAGE_BYTES;
    else if (file.type.startsWith('video/')) limit = MAX_VIDEO_BYTES;
    if (file.size > limit) {
      return `${file.name} is too large (${(file.size / 1024 / 1024).toFixed(
        1,
      )}MB). Max ${(limit / 1024 / 1024).toFixed(0)}MB.`;
    }
    return null;
  }

  async function uploadOne(item: PendingAttachment) {
    const fd = new FormData();
    fd.append('threadId', threadId);
    fd.append('file', item.file);
    try {
      const res = await fetch('/api/message-attachments', {
        method: 'POST',
        body: fd,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? `Upload failed (${res.status}).`);
      }
      const data = await res.json();
      setPending((prev) =>
        prev.map((p) =>
          p.localId === item.localId
            ? { ...p, status: 'ready', serverId: data.id }
            : p,
        ),
      );
    } catch (err) {
      setPending((prev) =>
        prev.map((p) =>
          p.localId === item.localId
            ? {
                ...p,
                status: 'error',
                error: err instanceof Error ? err.message : 'Upload failed.',
              }
            : p,
        ),
      );
    }
  }

  function onFilesPicked(e: React.ChangeEvent<HTMLInputElement>) {
    setAttachError(null);
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const currentCount = pending.length;
    const currentTotal = pending.reduce((s, p) => s + p.sizeBytes, 0);
    const toQueue: PendingAttachment[] = [];

    for (const file of files) {
      if (currentCount + toQueue.length >= MAX_ATTACHMENTS) {
        setAttachError(`At most ${MAX_ATTACHMENTS} attachments per message.`);
        break;
      }
      if (currentTotal + toQueue.reduce((s, p) => s + p.sizeBytes, 0) + file.size > MAX_TOTAL_BYTES) {
        setAttachError(
          `Total attachments would exceed ${(MAX_TOTAL_BYTES / 1024 / 1024).toFixed(0)}MB.`,
        );
        break;
      }
      const validationErr = validateBeforeUpload(file);
      if (validationErr) {
        setAttachError(validationErr);
        continue;
      }
      const isImage = file.type.startsWith('image/');
      toQueue.push({
        localId: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        file,
        status: 'uploading',
        contentType: file.type,
        sizeBytes: file.size,
        previewUrl: isImage ? URL.createObjectURL(file) : undefined,
      });
    }

    if (toQueue.length === 0) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setPending((prev) => [...prev, ...toQueue]);
    // Fire each upload independently; the per-item state updates as
    // results come in so the user sees progress per chip.
    for (const item of toQueue) {
      void uploadOne(item);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removePending(localId: string) {
    setPending((prev) => {
      const removing = prev.find((p) => p.localId === localId);
      if (removing?.previewUrl) URL.revokeObjectURL(removing.previewUrl);
      return prev.filter((p) => p.localId !== localId);
    });
  }

  function onEmojiPicked(emojiData: { emoji: string }) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? textarea.value.length;
    const before = textarea.value.slice(0, start);
    const after = textarea.value.slice(end);
    const next = `${before}${emojiData.emoji}${after}`;
    textarea.value = next;
    // Keep the caret right after the inserted glyph.
    const caret = start + emojiData.emoji.length;
    textarea.focus();
    textarea.setSelectionRange(caret, caret);
  }

  const readyIds = pending.filter((p) => p.status === 'ready').map((p) => p.serverId!).join(',');
  const anyUploading = pending.some((p) => p.status === 'uploading');
  const anyError = pending.some((p) => p.status === 'error');

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
          merged.map((m) => {
            const isDeleted = Boolean(m.deletedAt) || deletedIds.has(m.id);
            // The delete button only appears while the actor is the
            // sender, the message is still within the 15-min window,
            // and the surface is writable. Server re-checks on every
            // call so a stale tab can't slip past.
            const canDelete =
              !readOnly &&
              m.fromCurrentUser &&
              !isDeleted &&
              Date.now() - new Date(m.createdAt).getTime() < DELETE_WINDOW_MS;
            return (
            <li
              key={m.id}
              className={`flex flex-col gap-1 max-w-[80%] ${
                m.fromCurrentUser ? 'self-end items-end' : 'self-start items-start'
              }`}
            >
              {isDeleted && revealDeleted ? (
                // M.3.4: ops_admin oversight view. Show the original
                // body with strike-through + a [deleted by sender]
                // marker so safeguarding can read what was retracted.
                // Attachments stay visible but dimmed for the same
                // reason.
                <>
                  {m.body ? (
                    <div
                      className={`rounded-lg px-3 py-2 text-[0.9375rem] leading-[1.5] whitespace-pre-wrap break-words line-through opacity-70 ${
                        m.fromCurrentUser
                          ? 'bg-moss text-cream'
                          : 'bg-paper text-charcoal border border-moss/10'
                      }`}
                    >
                      {m.body}
                    </div>
                  ) : null}
                  {m.attachments && m.attachments.length > 0 ? (
                    <div className="flex flex-col gap-2 mt-0.5 w-full opacity-70">
                      {m.attachments.map((a) => (
                        <AttachmentBubble
                          key={a.id}
                          attachment={a}
                          fromCurrentUser={m.fromCurrentUser}
                        />
                      ))}
                    </div>
                  ) : null}
                  <span className="text-terracotta text-[0.7rem] font-medium uppercase tracking-[0.08em]">
                    [deleted by sender]
                  </span>
                </>
              ) : isDeleted ? (
                <div
                  className={`rounded-lg px-3 py-2 text-[0.875rem] leading-[1.5] italic ${
                    m.fromCurrentUser
                      ? 'bg-moss/30 text-cream'
                      : 'bg-stone/10 text-stone border border-moss/10'
                  }`}
                >
                  {m.fromCurrentUser ? 'Message deleted (by you).' : 'Message deleted.'}
                </div>
              ) : (
                <>
                  {m.body ? (
                    <div
                      className={`rounded-lg px-3 py-2 text-[0.9375rem] leading-[1.5] whitespace-pre-wrap break-words ${
                        m.fromCurrentUser
                          ? 'bg-moss text-cream'
                          : 'bg-paper text-charcoal border border-moss/10'
                      }`}
                    >
                      {m.body}
                    </div>
                  ) : null}
                  {m.attachments && m.attachments.length > 0 ? (
                    <div className="flex flex-col gap-2 mt-0.5 w-full">
                      {m.attachments.map((a) => (
                        <AttachmentBubble
                          key={a.id}
                          attachment={a}
                          fromCurrentUser={m.fromCurrentUser}
                        />
                      ))}
                    </div>
                  ) : null}
                </>
              )}
              <span className="text-stone text-[0.7rem] font-mono inline-flex items-center gap-2">
                {m.senderLabel} ·{' '}
                {new Date(m.createdAt).toLocaleString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'Europe/London',
                })}
                {canDelete ? (
                  <form
                    action={(fd) => {
                      // Optimistic local flip; the WS event from the
                      // server will arrive shortly and confirm.
                      setDeletedIds((prev) => {
                        if (prev.has(m.id)) return prev;
                        const next = new Set(prev);
                        next.add(m.id);
                        return next;
                      });
                      return deleteMessage(fd);
                    }}
                  >
                    <input type="hidden" name="messageId" value={m.id} />
                    <button
                      type="submit"
                      aria-label="Delete this message"
                      className="text-stone/60 hover:text-terracotta transition-colors inline-flex items-center"
                    >
                      <Trash2 size={12} strokeWidth={1.75} aria-hidden="true" />
                    </button>
                  </form>
                ) : null}
              </span>
            </li>
            );
          })
        )}
      </ul>

      {readOnly ? (
        <p className="text-stone text-[0.8125rem] italic">
          Read-only view. You are not a participant in this thread.
        </p>
      ) : (
      <form
        ref={formRef}
        action={action}
        className="flex flex-col gap-2"
        noValidate
      >
        <input type="hidden" name="threadId" value={threadId} />
        <input type="hidden" name="attachmentIds" value={readyIds} />

        {pending.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {pending.map((p) => (
              <li
                key={p.localId}
                className="flex items-center gap-2 bg-paper border border-moss/15 rounded-md px-2 py-1 text-[0.8125rem] max-w-[280px]"
              >
                {p.previewUrl ? (
                  // Local preview - never hits the network.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.previewUrl}
                    alt=""
                    className="w-8 h-8 rounded object-cover"
                  />
                ) : p.contentType.startsWith('video/') ? (
                  <FileText size={14} strokeWidth={1.75} aria-hidden="true" />
                ) : (
                  <FileText size={14} strokeWidth={1.75} aria-hidden="true" />
                )}
                <span className="flex-1 truncate text-charcoal">
                  {p.file.name}
                </span>
                {p.status === 'uploading' ? (
                  <Loader2
                    size={14}
                    strokeWidth={1.75}
                    className="animate-spin text-stone"
                    aria-label="Uploading"
                  />
                ) : p.status === 'error' ? (
                  <span className="text-terracotta text-[0.7rem]">!</span>
                ) : null}
                <button
                  type="button"
                  onClick={() => removePending(p.localId)}
                  aria-label={`Remove ${p.file.name}`}
                  className="text-stone hover:text-terracotta transition-colors"
                >
                  <X size={14} strokeWidth={1.75} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {attachError ? (
          <p className="text-terracotta text-[0.8125rem]">{attachError}</p>
        ) : null}
        {anyError ? (
          <p className="text-terracotta text-[0.8125rem]">
            One or more attachments failed to upload. Remove and try again.
          </p>
        ) : null}

        <label className="sr-only" htmlFor={`body-${threadId}`}>
          Message to {otherPartyLabel}
        </label>
        <textarea
          ref={textareaRef}
          id={`body-${threadId}`}
          name="body"
          rows={3}
          maxLength={4000}
          placeholder={`Reply to ${otherPartyLabel}…`}
          className="bg-paper border border-moss/15 rounded-md px-3 py-2 text-charcoal focus:outline-none focus:ring-2 focus:ring-moss/25 focus:border-moss/40 resize-y"
        />
        {state.error ? (
          <p className="text-terracotta text-[0.8125rem]">{state.error}</p>
        ) : null}

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 relative">
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT}
              multiple
              hidden
              onChange={onFilesPicked}
              aria-hidden="true"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Attach files"
              className="inline-flex items-center gap-1 text-stone hover:text-moss text-[0.8125rem] transition-colors px-2 py-1 rounded-md hover:bg-cream"
            >
              <Paperclip size={16} strokeWidth={1.75} aria-hidden="true" />
              Attach
            </button>
            <button
              type="button"
              onClick={() => setEmojiOpen((v) => !v)}
              aria-label="Insert emoji"
              aria-expanded={emojiOpen}
              className="inline-flex items-center gap-1 text-stone hover:text-moss text-[0.8125rem] transition-colors px-2 py-1 rounded-md hover:bg-cream"
            >
              <Smile size={16} strokeWidth={1.75} aria-hidden="true" />
              Emoji
            </button>
            {emojiOpen ? (
              <div className="absolute bottom-full left-0 mb-2 z-10 shadow-lg rounded-md overflow-hidden">
                <EmojiPicker
                  onEmojiClick={onEmojiPicked}
                  width={320}
                  height={380}
                  searchPlaceholder="Search emojis"
                  previewConfig={{ showPreview: false }}
                />
              </div>
            ) : null}
          </div>
          <SubmitButton disabled={anyUploading} />
        </div>
      </form>
      )}
    </div>
  );
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="inline-flex items-center justify-center font-body text-[0.875rem] text-paper bg-moss hover:bg-moss-deep disabled:opacity-60 rounded-full px-5 py-2 transition-colors"
    >
      {pending ? 'Sending…' : disabled ? 'Uploading…' : 'Send'}
    </button>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function AttachmentBubble({
  attachment,
  fromCurrentUser,
}: {
  attachment: MessageAttachmentRow;
  fromCurrentUser: boolean;
}) {
  const ct = attachment.contentType;
  const src = `/api/message-attachments/${attachment.id}`;
  const dlHref = `${src}?download=1`;
  const name = attachment.originalFilename || 'attachment';

  if (ct.startsWith('image/')) {
    return (
      <a
        href={dlHref}
        target="_blank"
        rel="noopener noreferrer"
        className={`block rounded-lg overflow-hidden border ${
          fromCurrentUser ? 'border-moss/30' : 'border-moss/10'
        } max-w-[320px]`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={name}
          width={attachment.width ?? undefined}
          height={attachment.height ?? undefined}
          className="block w-full h-auto"
          loading="lazy"
        />
      </a>
    );
  }

  if (ct.startsWith('video/')) {
    return (
      <video
        controls
        preload="metadata"
        className={`block rounded-lg max-w-[320px] border ${
          fromCurrentUser ? 'border-moss/30' : 'border-moss/10'
        }`}
      >
        <source src={src} type={ct} />
        Your browser cannot play this video.{' '}
        <a href={dlHref} className="link">
          Download instead.
        </a>
      </video>
    );
  }

  return (
    <a
      href={dlHref}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[0.8125rem] border ${
        fromCurrentUser
          ? 'bg-moss/90 text-cream border-moss/30 hover:bg-moss-deep'
          : 'bg-paper text-charcoal border-moss/10 hover:bg-cream'
      } transition-colors`}
    >
      <FileText size={16} strokeWidth={1.75} aria-hidden="true" />
      <span className="flex-1 truncate max-w-[220px]">{name}</span>
      <span
        className={`text-[0.7rem] font-mono ${
          fromCurrentUser ? 'text-cream/80' : 'text-stone'
        }`}
      >
        {formatBytes(attachment.sizeBytes)}
      </span>
      <Download size={14} strokeWidth={1.75} aria-hidden="true" />
    </a>
  );
}
