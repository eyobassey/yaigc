import type { CompanionApplicationStatus } from '@prisma/client';
import { transitionApplication } from '@/lib/companion';

const ALLOWED_NEXT: Record<
  CompanionApplicationStatus,
  CompanionApplicationStatus[]
> = {
  received: ['in_triage', 'declined', 'withdrawn'],
  in_triage: ['phone_screen', 'received', 'declined', 'withdrawn'],
  phone_screen: ['interview', 'in_triage', 'declined', 'withdrawn'],
  interview: ['vetting', 'phone_screen', 'declined', 'withdrawn'],
  vetting: ['complete', 'interview', 'declined', 'withdrawn'],
  complete: ['withdrawn'],
  declined: ['in_triage'],
  withdrawn: ['received'],
};

const STATUS_LABEL: Record<CompanionApplicationStatus, string> = {
  received: 'Move back to Received',
  in_triage: 'Move to In triage',
  phone_screen: 'Move to Phone screen',
  interview: 'Move to Interview',
  vetting: 'Move to Vetting',
  complete: 'Mark complete',
  declined: 'Decline',
  withdrawn: 'Withdraw',
};

const COMPLETE_DESCRIPTION =
  '"Complete" is set by approving the application. Use the green Approve button above to create the Companion record.';

export function TransitionPanel({
  applicationId,
  currentStatus,
}: {
  applicationId: string;
  currentStatus: CompanionApplicationStatus;
}) {
  const candidates = ALLOWED_NEXT[currentStatus];

  return (
    <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
      <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-3">
        Pipeline
      </h2>
      <form action={transitionApplication} className="flex flex-col gap-3">
        <input type="hidden" name="applicationId" value={applicationId} />
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-body text-[0.7rem] font-medium uppercase tracking-[0.08em] text-stone">
            Note (optional, required for decline)
          </span>
          <textarea
            name="note"
            rows={2}
            maxLength={2000}
            placeholder="Context for the next operator who reads this."
            className="bg-cream border border-moss/15 rounded-md px-3 py-2 text-charcoal text-[0.875rem] placeholder:text-stone/60 focus:border-moss focus:outline-none focus:ring-2 focus:ring-moss/20 resize-y"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {candidates.map((next) => {
            const isComplete = next === 'complete';
            return (
              <button
                key={next}
                type="submit"
                name="to"
                value={next}
                disabled={isComplete}
                title={isComplete ? COMPLETE_DESCRIPTION : STATUS_LABEL[next]}
                className={`inline-flex items-center px-3 py-1.5 rounded-md border text-[0.8125rem] font-medium transition-colors ${
                  next === 'declined'
                    ? 'border-terracotta/40 text-terracotta hover:bg-terracotta hover:text-cream'
                    : 'border-moss/20 text-moss hover:bg-moss hover:text-cream'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {STATUS_LABEL[next]}
              </button>
            );
          })}
        </div>
      </form>
    </section>
  );
}
