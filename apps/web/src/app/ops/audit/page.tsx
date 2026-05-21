import Link from 'next/link';
import { FileSearch, ChevronLeft, ChevronRight } from 'lucide-react';
import { prisma } from '@/lib/prisma';

export const metadata = {
  title: 'Audit log',
};

// Server-rendered audit viewer. List the most recent entries with cursor
// pagination by id (BIGSERIAL is monotonically increasing). Filters can be
// layered on later (by actor, action type, target type) but the simplest
// useful view is "show me the last N events" which this delivers.

const PAGE_SIZE = 50;

export default async function OpsAuditPage({
  searchParams,
}: {
  searchParams: { before?: string };
}) {
  const before = searchParams.before
    ? BigInt(searchParams.before)
    : undefined;

  const entries = await prisma.auditLogEntry.findMany({
    where: before ? { id: { lt: before } } : undefined,
    orderBy: { id: 'desc' },
    take: PAGE_SIZE + 1,
  });

  const hasMore = entries.length > PAGE_SIZE;
  const visible = hasMore ? entries.slice(0, PAGE_SIZE) : entries;
  const lastVisible = visible[visible.length - 1];
  const nextCursor = hasMore && lastVisible ? lastVisible.id.toString() : null;

  return (
    <div>
      <header className="mb-8 flex items-center gap-3">
        <FileSearch size={22} strokeWidth={1.75} className="text-moss" aria-hidden="true" />
        <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1]">
          Audit log
        </h1>
      </header>

      <p className="text-charcoal text-[0.9375rem] leading-[1.55] max-w-[60ch] mb-8">
        Append-only by DR-008. Every sensitive action becomes a row here.
        UPDATE and DELETE are blocked at the database layer by triggers, so
        this log can only grow.
      </p>

      <div className="bg-paper border border-moss/[0.08] rounded-[12px] overflow-hidden">
        {visible.length === 0 ? (
          <div className="px-6 py-12 text-center text-stone">
            No audit entries yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[0.875rem]">
              <thead className="bg-cream-deep">
                <tr className="text-left">
                  <Th>When</Th>
                  <Th>Actor</Th>
                  <Th>Action</Th>
                  <Th>Target</Th>
                  <Th>Detail</Th>
                </tr>
              </thead>
              <tbody>
                {visible.map((entry) => (
                  <tr key={entry.id.toString()} className="border-t border-moss/[0.06] align-top">
                    <Td>
                      <time
                        dateTime={entry.occurredAt.toISOString()}
                        className="font-mono text-[0.8125rem] text-charcoal whitespace-nowrap"
                        title={entry.occurredAt.toISOString()}
                      >
                        {formatWhen(entry.occurredAt)}
                      </time>
                    </Td>
                    <Td>
                      <div className="flex flex-col gap-0.5">
                        <Pill kind={entry.actorType}>{entry.actorType}</Pill>
                        <span className="text-stone text-[0.75rem] font-mono break-all">
                          {entry.actorId ?? <em className="not-italic text-stone/60">—</em>}
                        </span>
                      </div>
                    </Td>
                    <Td>
                      <Pill kind="action">{entry.actionType}</Pill>
                    </Td>
                    <Td>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-moss font-medium">{entry.targetType}</span>
                        <span className="text-stone text-[0.75rem] font-mono break-all">
                          {entry.targetId ?? <em className="not-italic text-stone/60">—</em>}
                        </span>
                      </div>
                    </Td>
                    <Td>
                      {entry.metadata ? (
                        <code className="text-[0.75rem] font-mono text-charcoal/80 break-all">
                          {JSON.stringify(entry.metadata)}
                        </code>
                      ) : (
                        <em className="not-italic text-stone/60">—</em>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <nav className="mt-6 flex items-center justify-between text-sm" aria-label="Pagination">
        <div className="text-stone">
          {visible.length} {visible.length === 1 ? 'entry' : 'entries'} on this page
        </div>
        <div className="flex items-center gap-2">
          {before ? (
            <Link
              href="/ops/audit"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-moss/15 text-moss hover:bg-moss/5 transition-colors"
            >
              <ChevronLeft size={14} strokeWidth={1.75} aria-hidden="true" />
              Newest
            </Link>
          ) : null}
          {nextCursor ? (
            <Link
              href={`/ops/audit?before=${nextCursor}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-moss/15 text-moss hover:bg-moss/5 transition-colors"
            >
              Older
              <ChevronRight size={14} strokeWidth={1.75} aria-hidden="true" />
            </Link>
          ) : null}
        </div>
      </nav>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2.5 font-body font-medium text-stone uppercase tracking-[0.08em] text-[0.6875rem] whitespace-nowrap">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 text-charcoal">{children}</td>;
}

function Pill({
  kind,
  children,
}: {
  kind: string;
  children: React.ReactNode;
}) {
  const color =
    kind === 'user'
      ? 'bg-moss/10 text-moss'
      : kind === 'system'
      ? 'bg-stone/15 text-stone'
      : kind === 'integration'
      ? 'bg-terracotta/10 text-terracotta'
      : 'bg-cream-deep text-charcoal';
  return (
    <span
      className={`inline-flex items-center font-body text-[0.6875rem] font-medium uppercase tracking-[0.06em] px-2 py-0.5 rounded ${color}`}
    >
      {children}
    </span>
  );
}

function formatWhen(d: Date) {
  // Compact ISO-ish format: 2026-05-21 16:55:01
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}
