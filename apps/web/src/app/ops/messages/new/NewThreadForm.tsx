'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { createThread, type CreateThreadState } from '@/lib/messaging';

const initial: CreateThreadState = { ok: false };

interface Option {
  id: string;
  label: string;
}

interface Props {
  initialPartyUserId: string | null;
  eligible: Option[];
}

export function NewThreadForm({ initialPartyUserId, eligible }: Props) {
  const [state, action] = useFormState(createThread, initial);

  return (
    <form
      action={action}
      noValidate
      className="bg-paper border border-moss/[0.08] rounded-[20px] p-[clamp(1.5rem,3vw,2.25rem)] flex flex-col gap-5"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="partyUserId" className="text-charcoal text-[0.9375rem]">
          Send to
        </label>
        <select
          id="partyUserId"
          name="partyUserId"
          required
          defaultValue={
            state.values?.partyUserId ?? initialPartyUserId ?? ''
          }
          className="bg-cream border border-moss/15 rounded-md px-3 py-2 text-charcoal focus:outline-none focus:ring-2 focus:ring-moss/25 focus:border-moss/40"
        >
          <option value="">Choose a person…</option>
          {eligible.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="subject" className="text-charcoal text-[0.9375rem]">
          Subject <span className="text-stone text-[0.8125rem]">(optional)</span>
        </label>
        <input
          id="subject"
          name="subject"
          type="text"
          maxLength={120}
          defaultValue={state.values?.subject ?? ''}
          placeholder="e.g. Tuesday visit rescheduled"
          className="bg-cream border border-moss/15 rounded-md px-3 py-2 text-charcoal focus:outline-none focus:ring-2 focus:ring-moss/25 focus:border-moss/40"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="body" className="text-charcoal text-[0.9375rem]">
          First message
        </label>
        <textarea
          id="body"
          name="body"
          required
          rows={5}
          maxLength={4000}
          defaultValue={state.values?.body ?? ''}
          className="bg-cream border border-moss/15 rounded-md px-3 py-2 text-charcoal focus:outline-none focus:ring-2 focus:ring-moss/25 focus:border-moss/40 resize-y"
        />
      </div>

      {state.error ? (
        <p className="text-terracotta text-[0.8125rem]">{state.error}</p>
      ) : null}

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="self-start inline-flex items-center justify-center font-body text-[0.9375rem] text-paper bg-moss hover:bg-moss-deep disabled:opacity-60 rounded-full px-6 py-2.5 transition-colors"
    >
      {pending ? 'Starting…' : 'Start thread'}
    </button>
  );
}
