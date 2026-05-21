import type { MatchStatus } from '@prisma/client';
import { transitionMatch } from '@/lib/match';

const LABEL: Record<'accepted' | 'declined' | 'withdrawn', string> = {
  accepted: 'Both sides have accepted',
  declined: 'Decline',
  withdrawn: 'Withdraw',
};

export function TransitionPanel({
  matchId,
  currentStatus,
}: {
  matchId: string;
  currentStatus: MatchStatus;
}) {
  if (currentStatus !== 'proposed') {
    return (
      <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
        <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-2">
          Match closed
        </h2>
        <p className="text-stone text-[0.875rem]">
          This match is <strong>{currentStatus}</strong>. No further transitions.
        </p>
      </section>
    );
  }

  return (
    <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
      <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-3">
        Response
      </h2>
      <form action={transitionMatch} className="flex flex-col gap-3">
        <input type="hidden" name="matchId" value={matchId} />
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-body text-[0.7rem] font-medium uppercase tracking-[0.08em] text-stone">
            Note (required for decline)
          </span>
          <textarea
            name="note"
            rows={2}
            maxLength={2000}
            placeholder="Captured from the phone call."
            className="bg-cream border border-moss/15 rounded-md px-3 py-2 text-charcoal text-[0.875rem] placeholder:text-stone/60 focus:border-moss focus:outline-none focus:ring-2 focus:ring-moss/20 resize-y"
          />
        </label>
        <div className="flex flex-col gap-2">
          <button
            type="submit"
            name="to"
            value="accepted"
            className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-moss text-cream text-[0.875rem] font-medium hover:bg-moss-dark transition-colors"
          >
            {LABEL.accepted}
          </button>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              name="to"
              value="declined"
              className="flex-1 inline-flex items-center justify-center px-3 py-1.5 rounded-md border border-terracotta/40 text-terracotta text-[0.8125rem] font-medium hover:bg-terracotta hover:text-cream transition-colors"
            >
              {LABEL.declined}
            </button>
            <button
              type="submit"
              name="to"
              value="withdrawn"
              className="flex-1 inline-flex items-center justify-center px-3 py-1.5 rounded-md border border-moss/20 text-moss text-[0.8125rem] font-medium hover:bg-moss hover:text-cream transition-colors"
            >
              {LABEL.withdrawn}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
