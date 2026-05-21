import Link from 'next/link';
import { Users, ChevronRight } from 'lucide-react';
import type { FamilyStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export const metadata = {
  title: 'Families',
};

const STATUSES: { value: FamilyStatus | 'all'; label: string }[] = [
  { value: 'prospect', label: 'Prospect' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'archived', label: 'Archived' },
  { value: 'all', label: 'All' },
];

export default async function OpsFamiliesPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const rawStatus = (searchParams.status ?? 'prospect') as
    | FamilyStatus
    | 'all';
  const status = STATUSES.some((s) => s.value === rawStatus)
    ? rawStatus
    : 'prospect';

  const where = status === 'all' ? {} : { status: status as FamilyStatus };

  const [counts, families] = await Promise.all([
    prisma.family.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
    prisma.family.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        recipients: { select: { firstName: true, lastName: true } },
        members: {
          select: {
            id: true,
            role: true,
            user: { select: { email: true, firstName: true, lastName: true } },
          },
        },
      },
    }),
  ]);

  const countByStatus = Object.fromEntries(
    counts.map((c) => [c.status, c._count._all]),
  ) as Record<FamilyStatus, number>;
  const totalAll = counts.reduce((s, c) => s + c._count._all, 0);

  return (
    <div>
      <header className="mb-6 flex items-center gap-3">
        <Users size={22} strokeWidth={1.75} className="text-moss" aria-hidden="true" />
        <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1]">
          Families
        </h1>
      </header>

      <nav aria-label="Status filter" className="mb-6 flex flex-wrap gap-2">
        {STATUSES.map((s) => {
          const active = s.value === status;
          const count =
            s.value === 'all' ? totalAll : countByStatus[s.value as FamilyStatus] ?? 0;
          return (
            <Link
              key={s.value}
              href={
                s.value === 'prospect'
                  ? '/ops/families'
                  : `/ops/families?status=${s.value}`
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
        {families.length === 0 ? (
          <div className="px-6 py-12 text-center text-stone">
            No families with status <strong>{status}</strong>.
          </div>
        ) : (
          <ul className="divide-y divide-moss/[0.08]">
            {families.map((f) => {
              const payer = f.members.find((m) => m.role === 'payer');
              const payerName = payer
                ? `${payer.user.firstName ?? ''} ${payer.user.lastName ?? ''}`.trim() ||
                  payer.user.email
                : '(no payer)';
              const recipientNames =
                f.recipients
                  .map((r) => `${r.firstName} ${r.lastName}`.trim())
                  .join(', ') || '(no recipients)';
              return (
                <li key={f.id}>
                  <Link
                    href={`/ops/families/${f.id}`}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-cream-deep/40 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <FamilyStatusPill status={f.status} />
                        <time
                          dateTime={f.createdAt.toISOString()}
                          className="text-stone text-[0.75rem] font-mono"
                        >
                          {formatRelative(f.createdAt)}
                        </time>
                      </div>
                      <div className="font-head text-moss text-[1.0625rem] font-medium">
                        {f.billingName}
                      </div>
                      <div className="text-stone text-[0.875rem] mt-0.5 break-words">
                        Payer: {payerName} · Recipient: {recipientNames}
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
    </div>
  );
}

export function FamilyStatusPill({ status }: { status: FamilyStatus }) {
  const map: Record<FamilyStatus, string> = {
    prospect: 'bg-terracotta/15 text-terracotta',
    active: 'bg-moss/15 text-moss',
    paused: 'bg-stone/15 text-stone',
    cancelled: 'bg-charcoal/10 text-charcoal',
    archived: 'bg-cream-deep text-stone',
  };
  return (
    <span
      className={`inline-flex items-center font-body text-[0.6875rem] font-medium uppercase tracking-[0.08em] px-2 py-0.5 rounded ${map[status]}`}
    >
      {status}
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
