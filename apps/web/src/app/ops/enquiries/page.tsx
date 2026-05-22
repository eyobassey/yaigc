import Link from 'next/link';
import { Inbox, ChevronRight } from 'lucide-react';
import type { EnquiryStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { Paginator } from '@/components/ui/Paginator';
import { parsePagination, buildView } from '@/lib/pagination';

export const metadata = {
  title: 'Enquiries',
};

const STATUSES: { value: EnquiryStatus | 'all'; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'triaged', label: 'Triaged' },
  { value: 'converted', label: 'Converted' },
  { value: 'closed', label: 'Closed' },
  { value: 'all', label: 'All' },
];

export default async function OpsEnquiriesPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const rawStatus = ((searchParams.status as string) ?? 'new') as EnquiryStatus | 'all';
  const status = STATUSES.some((s) => s.value === rawStatus)
    ? rawStatus
    : 'new';

  const where = status === 'all' ? {} : { status: status as EnquiryStatus };

  const state = parsePagination(searchParams, { pageSize: 25 });
  const [counts, total, enquiries] = await Promise.all([
    prisma.enquiry.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
    prisma.enquiry.count({ where }),
    prisma.enquiry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: state.skip,
      take: state.pageSize,
    }),
  ]);
  const view = buildView(state, total);

  const countByStatus = Object.fromEntries(
    counts.map((c) => [c.status, c._count._all]),
  ) as Record<EnquiryStatus, number>;
  const totalAll = counts.reduce((sum, c) => sum + c._count._all, 0);

  return (
    <div>
      <header className="mb-6 flex items-center gap-3">
        <Inbox size={22} strokeWidth={1.75} className="text-moss" aria-hidden="true" />
        <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1]">
          Enquiries
        </h1>
      </header>

      <nav aria-label="Status filter" className="mb-6 flex flex-wrap gap-2">
        {STATUSES.map((s) => {
          const isActive = s.value === status;
          const count =
            s.value === 'all' ? totalAll : countByStatus[s.value as EnquiryStatus] ?? 0;
          return (
            <Link
              key={s.value}
              href={s.value === 'new' ? '/ops/enquiries' : `/ops/enquiries?status=${s.value}`}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                isActive
                  ? 'bg-moss text-cream border-moss'
                  : 'bg-paper border-moss/15 text-charcoal hover:border-moss/30'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <span>{s.label}</span>
              <span
                className={`text-[0.7rem] font-medium tracking-[0.04em] ${
                  isActive ? 'text-cream/70' : 'text-stone'
                }`}
              >
                {count}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="bg-paper border border-moss/[0.08] rounded-[12px] overflow-hidden">
        {enquiries.length === 0 ? (
          <div className="px-6 py-12 text-center text-stone">
            No enquiries with status <strong>{status}</strong>.
          </div>
        ) : (
          <ul className="divide-y divide-moss/[0.08]">
            {enquiries.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/ops/enquiries/${e.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-cream-deep/40 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <StatusPill status={e.status} />
                      <SourcePill source={e.source} />
                      <time
                        dateTime={e.createdAt.toISOString()}
                        className="text-stone text-[0.75rem] font-mono"
                      >
                        {formatRelative(e.createdAt)}
                      </time>
                    </div>
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <span className="font-head text-moss text-[1.0625rem] font-medium">
                        {e.name}
                      </span>
                      <span className="text-stone text-sm">{e.email}</span>
                      {e.postcode ? (
                        <span className="font-body text-[0.7rem] uppercase tracking-[0.08em] text-stone bg-cream-deep px-2 py-0.5 rounded">
                          {e.postcode}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-charcoal text-[0.9375rem] leading-[1.45] mt-1.5 line-clamp-2">
                      {e.message}
                    </p>
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
        basePath="/ops/enquiries"
        searchParams={searchParams}
        view={view}
        label="enquiry"
      />
    </div>
  );
}

export function StatusPill({ status }: { status: EnquiryStatus }) {
  const map: Record<EnquiryStatus, string> = {
    new: 'bg-terracotta/15 text-terracotta',
    triaged: 'bg-moss/15 text-moss',
    converted: 'bg-sage/30 text-moss',
    closed: 'bg-stone/15 text-stone',
  };
  return (
    <span
      className={`inline-flex items-center font-body text-[0.6875rem] font-medium uppercase tracking-[0.08em] px-2 py-0.5 rounded ${map[status]}`}
    >
      {status}
    </span>
  );
}

export function SourcePill({ source }: { source: string }) {
  return (
    <span className="inline-flex items-center font-body text-[0.65rem] uppercase tracking-[0.08em] text-stone/80">
      {source.replace(/_/g, ' ')}
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
