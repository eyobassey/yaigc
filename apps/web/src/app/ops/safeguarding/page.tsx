import Link from 'next/link';
import { ShieldAlert, ChevronRight, Plus } from 'lucide-react';
import type { SafeguardingSeverity, SafeguardingStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { Paginator } from '@/components/ui/Paginator';
import { parsePagination, buildView } from '@/lib/pagination';

export const metadata = { title: 'Safeguarding' };

const FILTERS: { value: string; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'under_review', label: 'Under review' },
  { value: 'actioned', label: 'Actioned' },
  { value: 'closed', label: 'Closed' },
  { value: 'all', label: 'All' },
];

const NON_CLOSED: SafeguardingStatus[] = ['open', 'under_review', 'actioned'];

export default async function OpsSafeguardingPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const raw = (searchParams.status as string) ?? 'open';
  const status = FILTERS.some((f) => f.value === raw) ? raw : 'open';

  const where =
    status === 'all'
      ? {}
      : status === 'open' || status === 'under_review' || status === 'actioned' || status === 'closed'
      ? { status: status as SafeguardingStatus }
      : {};
  const state = parsePagination(searchParams, { pageSize: 25 });

  const [counts, total, cases] = await Promise.all([
    prisma.safeguardingCase.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.safeguardingCase.count({ where }),
    prisma.safeguardingCase.findMany({
      where,
      orderBy: [{ severity: 'desc' }, { openedAt: 'desc' }],
      skip: state.skip,
      take: state.pageSize,
      include: {
        subjectRecipient: { select: { firstName: true, lastName: true, preferredName: true } },
        assignedTo: { select: { firstName: true, lastName: true, email: true } },
      },
    }),
  ]);
  const view = buildView(state, total);

  const countByStatus = Object.fromEntries(counts.map((c) => [c.status, c._count._all])) as Record<
    SafeguardingStatus,
    number
  >;
  const totalAll = counts.reduce((s, c) => s + c._count._all, 0);

  return (
    <div>
      <header className="mb-6 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <ShieldAlert size={22} strokeWidth={1.75} className="text-red-700" aria-hidden="true" />
          <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1]">
            Safeguarding
          </h1>
        </div>
        <Link
          href="/ops/safeguarding/new"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-moss/20 text-moss text-[0.8125rem] font-medium hover:bg-moss hover:text-cream transition-colors whitespace-nowrap"
        >
          <Plus size={14} strokeWidth={1.75} aria-hidden="true" />
          Open a case
        </Link>
      </header>

      <nav aria-label="Status filter" className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = f.value === status;
          const count =
            f.value === 'all'
              ? totalAll
              : (countByStatus[f.value as SafeguardingStatus] ?? 0);
          return (
            <Link
              key={f.value}
              href={f.value === 'open' ? '/ops/safeguarding' : `/ops/safeguarding?status=${f.value}`}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                active
                  ? 'bg-moss text-cream border-moss'
                  : 'bg-paper border-moss/15 text-charcoal hover:border-moss/30'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              <span>{f.label}</span>
              <span className={`text-[0.7rem] font-medium tracking-[0.04em] ${active ? 'text-cream/70' : 'text-stone'}`}>
                {count}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="bg-paper border border-moss/[0.08] rounded-[12px] overflow-hidden">
        {cases.length === 0 ? (
          <div className="px-6 py-12 text-center text-stone">
            No cases in <strong>{status}</strong>.
          </div>
        ) : (
          <ul className="divide-y divide-moss/[0.08]">
            {cases.map((c) => {
              const subj = c.subjectRecipient
                ? c.subjectRecipient.preferredName ||
                  `${c.subjectRecipient.firstName} ${c.subjectRecipient.lastName}`
                : 'No subject recorded';
              const assignee = c.assignedTo
                ? `${c.assignedTo.firstName ?? ''} ${c.assignedTo.lastName ?? ''}`.trim() ||
                  c.assignedTo.email
                : null;
              return (
                <li key={c.id}>
                  <Link
                    href={`/ops/safeguarding/${c.id}`}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-cream-deep/40 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <SeverityPill severity={c.severity} />
                        <StatusPill status={c.status} />
                        <time
                          dateTime={c.openedAt.toISOString()}
                          className="text-stone text-[0.75rem] font-mono"
                        >
                          {c.openedAt.toISOString().slice(0, 10)}
                        </time>
                        {assignee ? (
                          <span className="text-stone text-[0.75rem]">
                            · assigned to {assignee}
                          </span>
                        ) : (
                          <span className="text-stone/60 text-[0.75rem]">· unassigned</span>
                        )}
                      </div>
                      <div className="font-head text-moss text-[1.0625rem] font-medium break-words">
                        {subj}
                      </div>
                      <div className="text-stone text-[0.875rem] mt-0.5 line-clamp-2 break-words">
                        {c.summary}
                      </div>
                    </div>
                    <ChevronRight
                      size={20}
                      strokeWidth={1.5}
                      aria-hidden="true"
                      className="text-stone/50 group-hover:text-moss flex-shrink-0 transition-colors"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Paginator
        basePath="/ops/safeguarding"
        searchParams={searchParams}
        view={view}
        label="case"
      />
    </div>
  );
}

export function SeverityPill({ severity }: { severity: SafeguardingSeverity }) {
  const map: Record<SafeguardingSeverity, string> = {
    low: 'bg-moss/10 text-moss',
    medium: 'bg-terracotta/15 text-terracotta',
    high: 'bg-red-700/15 text-red-700',
    critical: 'bg-red-700 text-cream',
  };
  return (
    <span
      className={`inline-flex items-center font-body text-[0.6875rem] font-medium uppercase tracking-[0.08em] px-2 py-0.5 rounded ${map[severity]}`}
    >
      {severity}
    </span>
  );
}

export function StatusPill({ status }: { status: SafeguardingStatus }) {
  const map: Record<SafeguardingStatus, string> = {
    open: 'bg-terracotta/15 text-terracotta',
    under_review: 'bg-moss/15 text-moss',
    actioned: 'bg-moss/15 text-moss',
    closed: 'bg-charcoal/10 text-charcoal',
  };
  return (
    <span
      className={`inline-flex items-center font-body text-[0.6875rem] font-medium uppercase tracking-[0.08em] px-2 py-0.5 rounded ${map[status]}`}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}

// Used by NON_CLOSED imports elsewhere if needed.
export { NON_CLOSED };
