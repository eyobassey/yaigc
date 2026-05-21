import Link from 'next/link';
import { Coins, AlertTriangle } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { requireFamilyMember } from '@/lib/auth-helpers';
import { summariseSubscription } from '@/lib/subscription-format';
import { requestSubscriptionChange } from '@/lib/family-portal';

export const metadata = { title: 'Subscription' };

export default async function FamilySubscriptionPage() {
  const { family } = await requireFamilyMember('/family/subscription');

  const subs = await prisma.subscription.findMany({
    where: {
      familyId: family.id,
      status: { in: ['active', 'paused'] },
    },
    include: {
      recipient: { select: { firstName: true, preferredName: true } },
      companion: { select: { firstName: true } },
    },
    orderBy: { startedAt: 'asc' },
  });

  return (
    <div>
      <header className="mb-6 flex items-center gap-3">
        <Coins size={22} strokeWidth={1.75} className="text-moss" aria-hidden="true" />
        <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1]">
          Subscription
        </h1>
      </header>

      {subs.length === 0 ? (
        <p className="text-charcoal text-[0.9375rem] leading-[1.55] max-w-[60ch]">
          Nothing recurring yet. Once we finalise the match and set up the rhythm, you will see it here with one-tap buttons to pause or cancel.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {subs.map((s) => {
            const recipientLabel = s.recipient.preferredName || s.recipient.firstName;
            const hasPauseRequest = Boolean(s.pauseRequestedAt);
            const hasCancelRequest = Boolean(s.cancelRequestedAt);
            const isPending = hasPauseRequest || hasCancelRequest;
            return (
              <article
                key={s.id}
                className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6"
              >
                <header className="mb-4">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <StatusPill status={s.status as 'active' | 'paused'} />
                  </div>
                  <h2 className="font-head text-moss text-[clamp(1.25rem,2.5vw,1.5rem)] font-medium leading-[1.2]">
                    {s.companion.firstName} visiting {recipientLabel}
                  </h2>
                  <p className="text-charcoal text-[0.9375rem] mt-2">
                    {summariseSubscription(s)}
                  </p>
                  {s.pauseStartAt ? (
                    <p className="text-stone text-[0.875rem] mt-2">
                      Paused since {s.pauseStartAt.toISOString().slice(0, 10)}
                      {s.pauseEndAt
                        ? `; planned to resume ${s.pauseEndAt.toISOString().slice(0, 10)}`
                        : ''}
                      .
                    </p>
                  ) : null}
                </header>

                {isPending ? (
                  <div className="mb-4 bg-amber-50 border-l-4 border-amber-400 px-4 py-3 rounded-r">
                    <p className="font-body text-[0.7rem] font-medium uppercase tracking-[0.12em] text-amber-700 mb-1 flex items-center gap-2">
                      <AlertTriangle size={14} strokeWidth={2} aria-hidden="true" />
                      Request received
                    </p>
                    <p className="text-charcoal text-[0.9375rem] leading-[1.55]">
                      {hasCancelRequest
                        ? 'We have your cancellation request and will be in touch shortly. The booking continues as scheduled until we have spoken.'
                        : 'We have your pause request and will be in touch shortly. Visits continue as scheduled until we have spoken.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-3 pt-4 border-t border-moss/10">
                    <ChangeRequestForm
                      subscriptionId={s.id}
                      kind="pause"
                      label="Pause"
                      hint="Take a break for a week, a month, longer."
                    />
                    <ChangeRequestForm
                      subscriptionId={s.id}
                      kind="cancel"
                      label="Cancel"
                      hint="End the recurring booking entirely."
                    />
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <p className="text-stone text-[0.8125rem] mt-8 max-w-[60ch] leading-[1.55]">
        Why these are requests, not switches: we always pick up the phone first, so nothing changes by accident. If you need something today,{' '}
        <Link href="/contact" className="link">
          email us
        </Link>{' '}
        and we will move fast.
      </p>
    </div>
  );
}

function ChangeRequestForm({
  subscriptionId,
  kind,
  label,
  hint,
}: {
  subscriptionId: string;
  kind: 'pause' | 'cancel';
  label: string;
  hint: string;
}) {
  return (
    <form action={requestSubscriptionChange} className="flex flex-col gap-2">
      <input type="hidden" name="subscriptionId" value={subscriptionId} />
      <input type="hidden" name="kind" value={kind} />
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-body text-[0.7rem] font-medium uppercase tracking-[0.08em] text-stone">
          {label}
        </span>
        <textarea
          name="reason"
          rows={2}
          maxLength={2000}
          placeholder={`Why ${label.toLowerCase()}? (optional, helps us help you)`}
          className="bg-cream border border-moss/15 rounded-md px-3 py-2 text-charcoal text-[0.875rem] placeholder:text-stone/60 focus:border-moss focus:outline-none focus:ring-2 focus:ring-moss/20 resize-y"
        />
        <span className="text-stone text-[0.75rem]">{hint}</span>
      </label>
      <button
        type="submit"
        className={`inline-flex items-center justify-center px-3 py-1.5 rounded-md text-[0.8125rem] font-medium transition-colors ${
          kind === 'cancel'
            ? 'border border-terracotta/40 text-terracotta hover:bg-terracotta hover:text-cream'
            : 'border border-moss/30 text-moss hover:bg-moss hover:text-cream'
        }`}
      >
        Request {label.toLowerCase()}
      </button>
    </form>
  );
}

function StatusPill({ status }: { status: 'active' | 'paused' }) {
  const cls =
    status === 'active' ? 'bg-moss/15 text-moss' : 'bg-terracotta/15 text-terracotta';
  return (
    <span
      className={`inline-flex items-center font-body text-[0.65rem] font-medium uppercase tracking-[0.08em] px-2 py-0.5 rounded ${cls}`}
    >
      {status}
    </span>
  );
}
