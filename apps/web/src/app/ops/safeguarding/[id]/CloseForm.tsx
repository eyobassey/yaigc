'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { closeCase, type CloseCaseState } from '@/lib/safeguarding';

const CLOSURE_OPTIONS = [
  { value: 'no_action_needed', label: 'No action needed (concern unfounded)' },
  { value: 'followed_up_with_family', label: 'Followed up with family' },
  { value: 'followed_up_with_companion', label: 'Followed up with companion' },
  { value: 'companion_removed', label: 'Companion removed from platform' },
  { value: 'external_referral', label: 'External referral (LA / police / social services)' },
  { value: 'other', label: 'Other' },
];

const initial: CloseCaseState = { ok: false };

export function CloseForm({ caseId }: { caseId: string }) {
  const [state, action] = useFormState(closeCase, initial);
  return (
    <section className="bg-paper border border-terracotta/20 rounded-[12px] p-5 sm:p-6">
      <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-terracotta mb-3">
        Close this case
      </h2>
      {state.errors?._form ? (
        <p className="text-terracotta text-[0.8125rem] mb-2">{state.errors._form}</p>
      ) : null}
      <form action={action} className="flex flex-col gap-3">
        <input type="hidden" name="caseId" value={caseId} />
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-body text-[0.7rem] font-medium uppercase tracking-[0.08em] text-stone">
            Category
          </span>
          <select
            name="closureCategory"
            required
            defaultValue={state.values?.closureCategory ?? ''}
            className="bg-cream border border-moss/15 rounded-md px-3 py-2 text-charcoal text-[0.875rem] focus:border-moss focus:outline-none focus:ring-2 focus:ring-moss/20"
          >
            <option value="" disabled>
              - pick one -
            </option>
            {CLOSURE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {state.errors?.closureCategory ? (
            <span className="text-terracotta text-[0.8125rem]">{state.errors.closureCategory}</span>
          ) : null}
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-body text-[0.7rem] font-medium uppercase tracking-[0.08em] text-stone">
            Closure note
          </span>
          <textarea
            name="closureNote"
            rows={3}
            required
            maxLength={4000}
            defaultValue={state.values?.closureNote}
            placeholder="What we did, what changed. Stays in the case record."
            className="bg-cream border border-moss/15 rounded-md px-3 py-2 text-charcoal text-[0.875rem] placeholder:text-stone/60 focus:border-moss focus:outline-none focus:ring-2 focus:ring-moss/20 resize-y"
          />
          {state.errors?.closureNote ? (
            <span className="text-terracotta text-[0.8125rem]">{state.errors.closureNote}</span>
          ) : null}
        </label>
        <SubmitButton />
      </form>
    </section>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="self-start inline-flex items-center justify-center px-4 py-2 rounded-md bg-terracotta text-cream text-[0.8125rem] font-medium hover:bg-terracotta-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? 'Closing…' : 'Close case'}
    </button>
  );
}
