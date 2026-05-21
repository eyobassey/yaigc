import type { SubscriptionStatus } from '@prisma/client';
import { transitionSubscription } from '@/lib/subscription';

export function TransitionPanel({
  subscriptionId,
  currentStatus,
}: {
  subscriptionId: string;
  currentStatus: SubscriptionStatus;
}) {
  if (currentStatus === 'canceled') {
    return (
      <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
        <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-2">
          Subscription ended
        </h2>
        <p className="text-stone text-[0.875rem]">
          Canceled. No further transitions.
        </p>
      </section>
    );
  }

  return (
    <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
      <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-3">
        Manage
      </h2>
      <form action={transitionSubscription} className="flex flex-col gap-3">
        <input type="hidden" name="subscriptionId" value={subscriptionId} />

        {currentStatus === 'active' ? (
          <>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-body text-[0.7rem] font-medium uppercase tracking-[0.08em] text-stone">
                Planned resume (optional, for pause)
              </span>
              <input
                type="date"
                name="pauseEndAt"
                className="bg-cream border border-moss/15 rounded-md px-3 py-2 text-charcoal text-[0.875rem] focus:border-moss focus:outline-none focus:ring-2 focus:ring-moss/20"
              />
            </label>
            <button
              type="submit"
              name="to"
              value="paused"
              className="inline-flex items-center justify-center px-4 py-2 rounded-md border border-terracotta/40 text-terracotta text-[0.875rem] font-medium hover:bg-terracotta hover:text-cream transition-colors"
            >
              Pause subscription
            </button>
          </>
        ) : (
          <button
            type="submit"
            name="to"
            value="active"
            className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-moss text-cream text-[0.875rem] font-medium hover:bg-moss-dark transition-colors"
          >
            Resume subscription
          </button>
        )}

        <label className="flex flex-col gap-1.5 text-sm pt-2 border-t border-moss/10">
          <span className="font-body text-[0.7rem] font-medium uppercase tracking-[0.08em] text-stone">
            Cancellation reason (for cancel)
          </span>
          <textarea
            name="note"
            rows={2}
            maxLength={2000}
            placeholder="Why this is being canceled."
            className="bg-cream border border-moss/15 rounded-md px-3 py-2 text-charcoal text-[0.875rem] placeholder:text-stone/60 focus:border-moss focus:outline-none focus:ring-2 focus:ring-moss/20 resize-y"
          />
        </label>
        <button
          type="submit"
          name="to"
          value="canceled"
          className="inline-flex items-center justify-center px-4 py-2 rounded-md border border-charcoal/30 text-charcoal text-[0.875rem] font-medium hover:bg-charcoal hover:text-cream transition-colors"
        >
          Cancel subscription
        </button>
      </form>
    </section>
  );
}
