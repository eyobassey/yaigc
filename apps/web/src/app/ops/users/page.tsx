import Link from 'next/link';
import { UserCog, ChevronRight, KeyRound, Fingerprint, Mail } from 'lucide-react';
import type { UserRole, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireOperator } from '@/lib/auth-helpers';
import { Paginator } from '@/components/ui/Paginator';
import { parsePagination, buildView } from '@/lib/pagination';

export const metadata = { title: 'Users' };

// All 8 roles per SDD §12.1. "all" + "deleted" are virtual filters.
const ROLE_FILTERS: { value: UserRole | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'family_payer', label: 'Family payer' },
  { value: 'family_viewer', label: 'Family viewer' },
  { value: 'companion', label: 'Companion' },
  { value: 'operator_coordinator', label: 'Coordinator' },
  { value: 'operator_safeguarding', label: 'Safeguarding lead' },
  { value: 'operator_finance', label: 'Finance' },
  { value: 'operator_admin', label: 'Admin' },
  { value: 'operator_read_only', label: 'Read-only' },
];

const ROLE_LABEL: Record<UserRole, string> = {
  family_payer: 'Family payer',
  family_viewer: 'Family viewer',
  companion: 'Companion',
  operator_coordinator: 'Coordinator',
  operator_safeguarding: 'Safeguarding lead',
  operator_finance: 'Finance',
  operator_admin: 'Admin',
  operator_read_only: 'Read-only',
};

const ROLE_TONE: Record<UserRole, string> = {
  family_payer: 'bg-moss/10 text-moss',
  family_viewer: 'bg-moss/10 text-moss',
  companion: 'bg-terracotta/15 text-terracotta',
  operator_coordinator: 'bg-cream-deep text-charcoal',
  operator_safeguarding: 'bg-red-100 text-red-800',
  operator_finance: 'bg-amber-100 text-amber-800',
  operator_admin: 'bg-moss text-cream',
  operator_read_only: 'bg-stone/15 text-stone',
};

export default async function OpsUsersPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  await requireOperator('/ops/users');

  const rawRole = (searchParams.role as string) ?? 'all';
  const role = ROLE_FILTERS.some((f) => f.value === rawRole) ? rawRole : 'all';
  const status = ((searchParams.status as string) ?? 'active') as
    | 'active'
    | 'deleted';
  const q = ((searchParams.q as string) ?? '').trim();
  const state = parsePagination(searchParams, { pageSize: 25 });

  const where: Prisma.UserWhereInput = {
    deletedAt: status === 'deleted' ? { not: null } : null,
    ...(role === 'all' ? {} : { role: role as UserRole }),
    ...(q.length >= 2
      ? {
          OR: [
            { email: { contains: q, mode: 'insensitive' as const } },
            { firstName: { contains: q, mode: 'insensitive' as const } },
            { lastName: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [roleCounts, total, users] = await Promise.all([
    prisma.user.groupBy({
      by: ['role'],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: state.skip,
      take: state.pageSize,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
        passwordHash: true,
        deletedAt: true,
        _count: {
          select: {
            authenticators: true,
            sessions: { where: { expires: { gt: new Date() } } },
          },
        },
      },
    }),
  ]);

  const view = buildView(state, total);

  const countByRole = Object.fromEntries(
    roleCounts.map((c) => [c.role, c._count._all]),
  ) as Record<UserRole, number>;
  const totalActiveAll = roleCounts.reduce((s, c) => s + c._count._all, 0);

  return (
    <div>
      <header className="mb-6 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <UserCog size={22} strokeWidth={1.75} className="text-moss" aria-hidden="true" />
          <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1]">
            Users
          </h1>
        </div>
      </header>

      <form
        action="/ops/users"
        method="get"
        className="mb-6 flex flex-wrap gap-2 items-center"
        role="search"
      >
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by name or email"
          aria-label="Search users"
          className="bg-paper border border-moss/15 rounded-full px-4 py-2 text-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-moss/25 focus:border-moss/40 w-full sm:w-[280px]"
        />
        {role !== 'all' ? <input type="hidden" name="role" value={role} /> : null}
        {status !== 'active' ? <input type="hidden" name="status" value={status} /> : null}
        <button
          type="submit"
          className="text-sm text-moss border border-moss/20 rounded-full px-4 py-2 hover:bg-moss/5 transition-colors"
        >
          Search
        </button>
      </form>

      <nav aria-label="Role filter" className="mb-3 flex flex-wrap gap-2">
        {ROLE_FILTERS.map((f) => {
          const active = f.value === role;
          const count =
            f.value === 'all' ? totalActiveAll : countByRole[f.value as UserRole] ?? 0;
          const params = new URLSearchParams();
          if (f.value !== 'all') params.set('role', f.value);
          if (q) params.set('q', q);
          if (status !== 'active') params.set('status', status);
          const href = `/ops/users${params.toString() ? `?${params}` : ''}`;
          return (
            <Link
              key={f.value}
              href={href}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                active
                  ? 'bg-moss text-cream border-moss'
                  : 'bg-paper border-moss/15 text-charcoal hover:border-moss/30'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              <span>{f.label}</span>
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

      <nav aria-label="Status filter" className="mb-6 flex gap-2 text-[0.875rem]">
        {(['active', 'deleted'] as const).map((s) => {
          const active = s === status;
          const params = new URLSearchParams();
          if (role !== 'all') params.set('role', role);
          if (q) params.set('q', q);
          if (s !== 'active') params.set('status', s);
          const href = `/ops/users${params.toString() ? `?${params}` : ''}`;
          return (
            <Link
              key={s}
              href={href}
              className={`px-2 py-0.5 rounded ${
                active ? 'text-moss font-medium' : 'text-stone hover:text-moss'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              {s === 'active' ? 'Active' : 'Soft-deleted'}
            </Link>
          );
        })}
      </nav>

      <div className="bg-paper border border-moss/[0.08] rounded-[12px] overflow-hidden">
        {users.length === 0 ? (
          <div className="px-6 py-12 text-center text-stone">
            No users match the current filters.
          </div>
        ) : (
          <ul className="divide-y divide-moss/[0.08]">
            {users.map((u) => {
              const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ');
              const auth: { icon: typeof KeyRound; title: string }[] = [];
              if (u.passwordHash) auth.push({ icon: KeyRound, title: 'Password' });
              if (u._count.authenticators > 0) {
                auth.push({
                  icon: Fingerprint,
                  title: `${u._count.authenticators} passkey${u._count.authenticators === 1 ? '' : 's'}`,
                });
              }
              if (auth.length === 0) auth.push({ icon: Mail, title: 'Magic-link only' });

              return (
                <li key={u.id}>
                  <Link
                    href={`/ops/users/${u.id}`}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-cream-deep/40 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span
                          className={`inline-flex items-center font-body text-[0.65rem] font-medium uppercase tracking-[0.08em] px-2 py-0.5 rounded ${ROLE_TONE[u.role]}`}
                        >
                          {ROLE_LABEL[u.role]}
                        </span>
                        {u.deletedAt ? (
                          <span className="inline-flex items-center font-body text-[0.65rem] font-medium uppercase tracking-[0.08em] px-2 py-0.5 rounded bg-stone/15 text-stone">
                            Deleted
                          </span>
                        ) : null}
                        <div className="flex items-center gap-1 text-stone">
                          {auth.map((a, i) => (
                            <a.icon
                              key={i}
                              size={12}
                              strokeWidth={1.75}
                              aria-label={a.title}
                              className="text-stone"
                            />
                          ))}
                        </div>
                        <span className="text-stone text-[0.7rem]">
                          {u._count.sessions} active session
                          {u._count.sessions === 1 ? '' : 's'}
                        </span>
                      </div>
                      <div className="font-head text-moss text-[1.0625rem] font-medium">
                        {fullName || <span className="text-stone italic">(no name)</span>}
                      </div>
                      <div className="text-stone text-[0.875rem] mt-0.5 break-all">
                        {u.email} · joined {u.createdAt.toISOString().slice(0, 10)}
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
        basePath="/ops/users"
        searchParams={searchParams}
        view={view}
        label="user"
      />
    </div>
  );
}
