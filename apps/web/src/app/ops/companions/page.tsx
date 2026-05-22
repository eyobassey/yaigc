import Link from 'next/link';
import { Heart, ChevronRight } from 'lucide-react';
import type { CompanionApplicationStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { Paginator } from '@/components/ui/Paginator';
import { parsePagination, buildView } from '@/lib/pagination';

export const metadata = { title: 'Companions' };

const STATUSES: { value: CompanionApplicationStatus | 'all'; label: string }[] = [
  { value: 'received', label: 'Received' },
  { value: 'in_triage', label: 'In triage' },
  { value: 'phone_screen', label: 'Phone screen' },
  { value: 'interview', label: 'Interview' },
  { value: 'vetting', label: 'Vetting' },
  { value: 'complete', label: 'Complete' },
  { value: 'declined', label: 'Declined' },
  { value: 'withdrawn', label: 'Withdrawn' },
  { value: 'all', label: 'All' },
];

export default async function OpsCompanionsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const rawStatus = ((searchParams.status as string) ?? 'received') as
    | CompanionApplicationStatus
    | 'all';
  const status = STATUSES.some((s) => s.value === rawStatus) ? rawStatus : 'received';

  const where =
    status === 'all' ? {} : { status: status as CompanionApplicationStatus };
  const state = parsePagination(searchParams, { pageSize: 25 });

  const [counts, total, applications, activeCompanions] = await Promise.all([
    prisma.companionApplication.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
    prisma.companionApplication.count({ where }),
    prisma.companionApplication.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: state.skip,
      take: state.pageSize,
      include: {
        companion: {
          select: { id: true, status: true, borough: true },
        },
      },
    }),
    prisma.companion.count(),
  ]);
  const view = buildView(state, total);

  const countByStatus = Object.fromEntries(
    counts.map((c) => [c.status, c._count._all]),
  ) as Record<CompanionApplicationStatus, number>;
  const totalAll = counts.reduce((s, c) => s + c._count._all, 0);

  return (
    <div>
      <header className="mb-6 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Heart size={22} strokeWidth={1.75} className="text-moss" aria-hidden="true" />
          <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1]">
            Companions
          </h1>
        </div>
        <div className="text-stone text-[0.875rem]">
          {activeCompanions} active companion{activeCompanions === 1 ? '' : 's'}
        </div>
      </header>

      <nav aria-label="Status filter" className="mb-6 flex flex-wrap gap-2">
        {STATUSES.map((s) => {
          const active = s.value === status;
          const count =
            s.value === 'all'
              ? totalAll
              : countByStatus[s.value as CompanionApplicationStatus] ?? 0;
          return (
            <Link
              key={s.value}
              href={
                s.value === 'received'
                  ? '/ops/companions'
                  : `/ops/companions?status=${s.value}`
              }
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                active
                  ? 'bg-moss text-cream border-moss'
                  : 'bg-paper border-moss/15 text-charcoal hover:border-moss/30'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              <span>{s.label}</span>
              <span
                className={`text-[0.7rem] font-medium tracking-[0.04em] ${
                  active ? 'text-cream/70' : 'text-stone'
                }`}
              >
                {count}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="bg-paper border border-moss/[0.08] rounded-[12px] overflow-hidden">
        {applications.length === 0 ? (
          <div className="px-6 py-12 text-center text-stone">
            No applications with status <strong>{status}</strong>.
          </div>
        ) : (
          <ul className="divide-y divide-moss/[0.08]">
            {applications.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/ops/companions/${a.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-cream-deep/40 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <ApplicationStatusPill status={a.status} />
                      {a.companion ? (
                        <span className="font-body text-[0.6875rem] uppercase tracking-[0.06em] text-moss bg-moss/10 rounded px-1.5 py-0.5">
                          {a.companion.borough.replace('_', ' ')}
                        </span>
                      ) : null}
                      <time
                        dateTime={a.createdAt.toISOString()}
                        className="text-stone text-[0.75rem] font-mono"
                      >
                        {formatRelative(a.createdAt)}
                      </time>
                    </div>
                    <div className="font-head text-moss text-[1.0625rem] font-medium">
                      {a.firstName} {a.lastName}
                    </div>
                    <div className="text-stone text-[0.875rem] mt-0.5 break-all">
                      {a.email} · {a.phone} · {a.postcode}
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
            ))}
          </ul>
        )}
      </div>

      <Paginator
        basePath="/ops/companions"
        searchParams={searchParams}
        view={view}
        label="application"
      />
    </div>
  );
}

export function ApplicationStatusPill({
  status,
}: {
  status: CompanionApplicationStatus;
}) {
  const map: Record<CompanionApplicationStatus, string> = {
    received: 'bg-terracotta/15 text-terracotta',
    in_triage: 'bg-moss/15 text-moss',
    phone_screen: 'bg-moss/15 text-moss',
    interview: 'bg-moss/15 text-moss',
    vetting: 'bg-moss/20 text-moss',
    complete: 'bg-sage/30 text-moss',
    declined: 'bg-charcoal/10 text-charcoal',
    withdrawn: 'bg-stone/15 text-stone',
  };
  return (
    <span
      className={`inline-flex items-center font-body text-[0.6875rem] font-medium uppercase tracking-[0.08em] px-2 py-0.5 rounded ${map[status]}`}
    >
      {status.replace('_', ' ')}
    </span>
  );
}

function formatRelative(d: Date) {
  const ms = Date.now() - d.getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}
