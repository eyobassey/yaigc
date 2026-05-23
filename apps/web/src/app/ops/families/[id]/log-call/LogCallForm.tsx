'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { logRelationshipNote, type LogNoteState } from '@/lib/relationship';

const initial: LogNoteState = { ok: false };

export function LogCallForm({
  familyId,
  kind,
}: {
  familyId: string;
  kind: 'fifth_visit' | 'check_in';
}) {
  const [state, action] = useFormState(logRelationshipNote, initial);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="familyId" value={familyId} />
      <input type="hidden" name="callType" value={kind} />
      <label htmlFor="note-body" className="sr-only">
        Note from the call
      </label>
      <textarea
        id="note-body"
        name="body"
        rows={10}
        defaultValue={state.values?.body ?? ''}
        placeholder="What did they say? How does it feel? Anything to adjust?"
        className="bg-paper border border-moss/15 rounded-md px-3 py-2 text-charcoal text-[0.9375rem] leading-[1.6] focus:outline-none focus:ring-2 focus:ring-moss/25 focus:border-moss/40 resize-y"
      />
      {state.error ? (
        <p className="text-terracotta text-[0.875rem]">{state.error}</p>
      ) : null}
      <Submit />
    </form>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="self-start inline-flex items-center gap-2 px-4 py-2 rounded-md bg-moss text-cream text-[0.9375rem] font-medium hover:bg-moss-deep disabled:opacity-60 transition-colors"
    >
      {pending ? 'Sending…' : 'Save and email the family'}
    </button>
  );
}
