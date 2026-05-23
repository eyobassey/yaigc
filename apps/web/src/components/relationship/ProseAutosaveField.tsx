'use client';

import { useEffect, useRef, useState } from 'react';
import { useFormState } from 'react-dom';
import type { SaveProseState } from '@/lib/relationship';

// R.2 - generic prose-with-helper-prompts editor backed by an autosave
// server action. The form submits on blur of the textarea; the action
// is responsible for diffing against the prior value, so blurs that
// didn't change anything are cheap no-ops at the server.
//
// Why not debounce-while-typing? "Held lightly" (memo s4.1.2) maps to
// "save when the thought is done", which is when you tab away. Typing-
// debounce would also create more FamilyTextRevision rows than the
// change-over-time story actually wants.

interface Props {
  action: (
    state: SaveProseState,
    formData: FormData,
  ) => Promise<SaveProseState>;
  initialValue: string;
  hiddenFields?: Record<string, string>;
  fieldName?: string; // form-field name for the textarea (default: "body")
  label: string;
  // Lead question rendered as the textarea placeholder. Short, in the
  // memo's voice. Example: "What would tell you, three months from now,
  // that this was money well spent?"
  placeholder?: string;
  // Optional helper prompts rendered as a small italic bullet list
  // below the textarea. Suggestions, never required.
  helperPrompts?: string[];
  // Optional explanatory paragraph between label and textarea (e.g.
  // "Not what you want for your mum or dad. What you want for
  // yourself..." for the hopes field).
  helperLead?: string;
  rows?: number;
}

const initial: SaveProseState = { ok: false };
const SAVED_VISIBLE_MS = 2000;

export function ProseAutosaveField({
  action,
  initialValue,
  hiddenFields,
  fieldName = 'body',
  label,
  placeholder,
  helperPrompts,
  helperLead,
  rows = 6,
}: Props) {
  const [state, formAction] = useFormState(action, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastSubmittedRef = useRef<string>(initialValue);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Flash a transient "Saved" hint whenever the action returns ok. The
  // hint fades after a short delay so the affordance isn't permanent.
  useEffect(() => {
    if (!state.ok) return;
    const now = Date.now();
    setSavedAt(now);
    const id = setTimeout(() => {
      setSavedAt((current) => (current === now ? null : current));
    }, SAVED_VISIBLE_MS);
    return () => clearTimeout(id);
  }, [state.ok]);

  function onBlur() {
    const next = textareaRef.current?.value ?? '';
    if (next.trim() === lastSubmittedRef.current.trim()) return;
    lastSubmittedRef.current = next;
    formRef.current?.requestSubmit();
  }

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-1.5">
      {hiddenFields
        ? Object.entries(hiddenFields).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))
        : null}
      <div className="flex items-baseline justify-between gap-3">
        <label
          htmlFor={`${fieldName}-${hiddenFields?.recipientId ?? 'family'}`}
          className="font-body text-[0.75rem] font-medium uppercase tracking-[0.08em] text-stone"
        >
          {label}
        </label>
        <span
          aria-live="polite"
          className={
            'text-[0.7rem] font-mono transition-opacity duration-300 ' +
            (savedAt ? 'text-moss opacity-100' : 'opacity-0')
          }
        >
          Saved
        </span>
      </div>
      {helperLead ? (
        <p className="text-stone text-[0.8125rem] italic leading-[1.5]">
          {helperLead}
        </p>
      ) : null}
      <textarea
        ref={textareaRef}
        id={`${fieldName}-${hiddenFields?.recipientId ?? 'family'}`}
        name={fieldName}
        defaultValue={initialValue}
        rows={rows}
        placeholder={placeholder}
        onBlur={onBlur}
        className="bg-paper border border-moss/15 rounded-md px-3 py-2 text-charcoal text-[0.9375rem] leading-[1.55] focus:outline-none focus:ring-2 focus:ring-moss/25 focus:border-moss/40 resize-y"
      />
      {helperPrompts && helperPrompts.length > 0 ? (
        <ul className="text-stone text-[0.8125rem] italic leading-[1.5] list-disc pl-5 mt-1 space-y-0.5">
          {helperPrompts.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      ) : null}
      {state.error ? (
        <p className="text-terracotta text-[0.8125rem] mt-1">{state.error}</p>
      ) : null}
    </form>
  );
}
