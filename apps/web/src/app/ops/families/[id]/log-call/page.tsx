import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, Phone } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { requireOperator } from '@/lib/auth-helpers';
import { LogCallForm } from './LogCallForm';

export const metadata = { title: 'Log a call' };

// R.5 - operator-only workflow page. Two kinds of call land here,
// disambiguated by ?kind=fifth_visit or ?kind=check_in. The page
// surfaces what the memo (s4.3) says the operator should have in
// front of them during the call: the family's own prose + the most
// recent post-visit reports. No scoring fields, no checkboxes.

type CallKind = 'fifth_visit' | 'check_in';

function parseKind(raw: string | string[] | undefined): CallKind {
  return raw === 'fifth_visit' ? 'fifth_visit' : 'check_in';
}

export default async function OpsLogCallPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  await requireOperator(`/ops/families/${params.id}/log-call`);
  const kind = parseKind(searchParams.kind);

  const family = await prisma.family.findUnique({
    where: { id: params.id },
    include: {
      recipients: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          preferredName: true,
          aboutTheRecipient: true,
        },
      },
      members: {
        where: { role: 'payer', deletedAt: null },
        take: 1,
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
        },
      },
      visits: {
        where: { state: 'reported', report: { isNot: null } },
        orderBy: { scheduledStartAt: 'desc' },
        take: 3,
        include: {
          report: { select: { whatHappened: true, createdAt: true } },
          recipient: { select: { firstName: true, preferredName: true } },
        },
      },
    },
  });
  if (!family) notFound();

  const payer = family.members[0]?.user ?? null;
  const payerLabel =
    [payer?.firstName, payer?.lastName].filter(Boolean).join(' ') ||
    payer?.email ||
    'the payer';

  const kindLabel =
    kind === 'fifth_visit' ? 'Fifth-visit reflection call' : 'Check-in';
  const guidance =
    kind === 'fifth_visit'
      ? 'About fifteen minutes. Phone, not video. Warm, unhurried, curious. How does it feel? Is the companion the right match? Anything to adjust? Anything they have not yet said?'
      : 'A short relationship check-in. "It has been a while. How does it feel?" That is the whole script. The answer is what we are listening for.';

  return (
    <div className="max-w-[820px]">
      <Link
        href={`/ops/families/${family.id}`}
        className="inline-flex items-center gap-1 text-stone hover:text-moss text-sm mb-4 transition-colors"
      >
        <ChevronLeft size={14} strokeWidth={1.75} aria-hidden="true" />
        Back to {family.billingName}
      </Link>

      <header className="mb-6">
        <span className="font-body text-[0.75rem] font-medium uppercase tracking-[0.12em] text-stone mb-2 inline-block">
          {kindLabel}
        </span>
        <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1] break-words">
          With {payerLabel}
        </h1>
      </header>

      <section className="mb-6 rounded-md border-l-4 border-terracotta bg-terracotta/[0.06] px-4 py-3">
        <p className="text-charcoal text-[0.875rem] leading-[1.55]">{guidance}</p>
      </section>

      {family.recipients.some((r) => r.aboutTheRecipient) ? (
        <section className="mb-6 bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
          <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-3">
            What the family has said
          </h2>
          <div className="flex flex-col gap-4">
            {family.recipients.map((r) =>
              r.aboutTheRecipient ? (
                <div key={r.id}>
                  <h3 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.08em] text-terracotta mb-1">
                    About {r.preferredName || r.firstName}
                  </h3>
                  <p className="text-charcoal text-[0.9375rem] leading-[1.6] whitespace-pre-wrap break-words">
                    {r.aboutTheRecipient}
                  </p>
                </div>
              ) : null,
            )}
          </div>
        </section>
      ) : null}

      {family.whatWeAreHopingFor ? (
        <section className="mb-6 bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
          <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-3">
            What they were hoping for
          </h2>
          <p className="text-charcoal text-[0.9375rem] leading-[1.6] whitespace-pre-wrap break-words">
            {family.whatWeAreHopingFor}
          </p>
        </section>
      ) : null}

      {family.visits.length > 0 ? (
        <section className="mb-6 bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
          <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-3">
            Recent post-visit reports
          </h2>
          <ol className="flex flex-col gap-4 divide-y divide-moss/[0.06]">
            {family.visits.map((v) => (
              <li key={v.id} className="pt-4 first:pt-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap text-stone text-[0.7rem] font-mono">
                  <time dateTime={v.scheduledStartAt.toISOString()}>
                    {v.scheduledStartAt.toISOString().slice(0, 10)}
                  </time>
                  <span>·</span>
                  <span>
                    {v.recipient?.preferredName || v.recipient?.firstName || 'recipient'}
                  </span>
                </div>
                <p className="text-charcoal text-[0.9375rem] leading-[1.55] whitespace-pre-wrap break-words">
                  {v.report?.whatHappened ?? '(no summary)'}
                </p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
        <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-2 inline-flex items-center gap-2">
          <Phone size={14} strokeWidth={1.75} className="text-moss" aria-hidden="true" />
          Note from the call
        </h2>
        <p className="text-stone text-[0.8125rem] mb-4 leading-[1.55]">
          Three or four paragraphs is plenty. Warm voice. The note goes to{' '}
          {payerLabel} by email and shows up on this family's record.
        </p>
        <LogCallForm familyId={family.id} kind={kind} />
      </section>
    </div>
  );
}
