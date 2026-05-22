import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ChevronLeft,
  UserCog,
  KeyRound,
  Fingerprint,
  Monitor,
  Users as UsersIcon,
  Heart,
  Pencil,
} from 'lucide-react';
// Monitor is used in the Active sessions section below.
import type { UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireOperator } from '@/lib/auth-helpers';
import { deviceLabel } from '@/lib/session';
import { Paginator } from '@/components/ui/Paginator';
import { parsePagination, buildView } from '@/lib/pagination';

export const metadata = { title: 'User' };

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

function formatDate(d: Date | null | undefined): string {
  if (!d) return '-';
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(d: Date | null | undefined): string {
  if (!d) return '-';
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/London',
  });
}

export default async function OpsUserDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const actor = await requireOperator(`/ops/users/${params.id}`);

  const historyState = parsePagination(searchParams, {
    pageSize: 20,
    pageParam: 'hp',
  });

  const [user, lastSignIn, historyTotal, history] = await Promise.all([
    prisma.user.findUnique({
      where: { id: params.id },
      include: {
        familyMembers: {
          where: { deletedAt: null },
          include: {
            family: { select: { id: true, billingName: true, status: true } },
          },
        },
        companion: {
          select: {
            id: true,
            applicationId: true,
            status: true,
            borough: true,
            firstName: true,
            lastName: true,
          },
        },
        authenticators: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            nickname: true,
            credentialBackedUp: true,
            createdAt: true,
            lastUsedAt: true,
          },
        },
        sessions: {
          where: { expires: { gt: new Date() } },
          orderBy: { lastActiveAt: 'desc' },
          select: {
            id: true,
            userAgent: true,
            createdAt: true,
            lastActiveAt: true,
            expires: true,
          },
        },
      },
    }),
    prisma.auditLogEntry.findFirst({
      where: { actorType: 'user', actorId: params.id, actionType: 'auth' },
      orderBy: { id: 'desc' },
      select: { occurredAt: true, metadata: true },
    }),
    prisma.auditLogEntry.count({
      where: {
        OR: [
          { actorId: params.id, actorType: 'user' },
          { targetType: 'User', targetId: params.id },
          { targetType: 'Session', targetId: params.id },
        ],
      },
    }),
    prisma.auditLogEntry.findMany({
      where: {
        OR: [
          { actorId: params.id, actorType: 'user' },
          { targetType: 'User', targetId: params.id },
          { targetType: 'Session', targetId: params.id },
        ],
      },
      orderBy: { id: 'desc' },
      skip: historyState.skip,
      take: historyState.pageSize,
    }),
  ]);

  if (!user) notFound();

  const historyView = buildView(historyState, historyTotal);

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');

  // Linked records derive what other ops pages this user reaches.
  const familyMemberships = user.familyMembers;
  const companion = user.companion;

  return (
    <div className="max-w-[960px]">
      <div className="flex items-center justify-between gap-3 mb-4">
        <Link
          href="/ops/users"
          className="inline-flex items-center gap-1 text-stone hover:text-moss text-sm transition-colors"
        >
          <ChevronLeft size={14} strokeWidth={1.75} aria-hidden="true" />
          All users
        </Link>
        {actor.role === 'operator_admin' && !user?.deletedAt ? (
          <Link
            href={`/ops/users/${params.id}/edit`}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-moss/20 text-moss text-sm hover:bg-moss/5 transition-colors"
          >
            <Pencil size={14} strokeWidth={1.75} aria-hidden="true" />
            Edit
          </Link>
        ) : null}
      </div>

      <header className="mb-6">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span
            className={`inline-flex items-center font-body text-[0.7rem] font-medium uppercase tracking-[0.08em] px-2 py-0.5 rounded ${ROLE_TONE[user.role]}`}
          >
            {ROLE_LABEL[user.role]}
          </span>
          {user.deletedAt ? (
            <span className="inline-flex items-center font-body text-[0.7rem] font-medium uppercase tracking-[0.08em] px-2 py-0.5 rounded bg-stone/15 text-stone">
              Deleted {formatDate(user.deletedAt)}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <UserCog
            size={22}
            strokeWidth={1.75}
            className="text-moss"
            aria-hidden="true"
          />
          <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1] break-words">
            {fullName || <span className="text-stone italic">(no name)</span>}
          </h1>
        </div>
        <p className="text-stone text-[0.9375rem] mt-1 break-all">
          {user.email}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-6">
          <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
            <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-3">
              Profile
            </h2>
            <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-[0.9375rem]">
              <dt className="text-stone">User ID</dt>
              <dd className="text-charcoal font-mono text-[0.8125rem] break-all">
                {user.id}
              </dd>
              <dt className="text-stone">Joined</dt>
              <dd className="text-charcoal">{formatDate(user.createdAt)}</dd>
              <dt className="text-stone">Email verified</dt>
              <dd className="text-charcoal">
                {user.emailVerified ? formatDate(user.emailVerified) : 'No'}
              </dd>
              <dt className="text-stone">Last signed in</dt>
              <dd className="text-charcoal">
                {lastSignIn ? (
                  <>
                    {formatDateTime(lastSignIn.occurredAt)}
                    {lastSignIn.metadata &&
                    typeof lastSignIn.metadata === 'object' &&
                    'method' in lastSignIn.metadata ? (
                      <span className="text-stone text-[0.8125rem] ml-2">
                        ({String((lastSignIn.metadata as { method: string }).method)})
                      </span>
                    ) : null}
                  </>
                ) : (
                  'Never'
                )}
              </dd>
            </dl>
          </section>

          {familyMemberships.length > 0 ? (
            <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
              <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-3 flex items-center gap-2">
                <UsersIcon size={14} strokeWidth={1.75} className="text-moss" aria-hidden="true" />
                Family memberships ({familyMemberships.length})
              </h2>
              <ul className="divide-y divide-moss/[0.06]">
                {familyMemberships.map((m) => (
                  <li key={m.id} className="py-3 first:pt-0 last:pb-0">
                    <Link
                      href={`/ops/families/${m.family.id}`}
                      className="flex items-center justify-between gap-3 hover:opacity-80 transition-opacity"
                    >
                      <div>
                        <div className="text-charcoal text-[0.9375rem] font-medium">
                          {m.family.billingName}
                        </div>
                        <div className="text-stone text-[0.8125rem] capitalize">
                          {m.role}
                          {m.relationshipToRecipient
                            ? ` · ${m.relationshipToRecipient}`
                            : ''}
                          {m.isPrimaryContact ? ' · primary contact' : ''}
                          {' · '}household status: {m.family.status.replace(/_/g, ' ')}
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {companion ? (
            <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
              <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-3 flex items-center gap-2">
                <Heart size={14} strokeWidth={1.75} className="text-terracotta" aria-hidden="true" />
                Companion record
              </h2>
              <Link
                href={`/ops/companions/${companion.applicationId}`}
                className="flex items-center justify-between gap-3 hover:opacity-80 transition-opacity"
              >
                <div>
                  <div className="text-charcoal text-[0.9375rem] font-medium">
                    {companion.firstName} {companion.lastName}
                  </div>
                  <div className="text-stone text-[0.8125rem] capitalize">
                    {companion.status} · {companion.borough.replace(/_/g, ' ')}
                  </div>
                </div>
              </Link>
            </section>
          ) : null}

          <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
            <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-3">
              History
            </h2>
            {history.length === 0 ? (
              <p className="text-stone text-sm">No history yet.</p>
            ) : (
              <ul className="flex flex-col gap-2 text-[0.8125rem]">
                {history.map((e) => (
                  <li key={e.id.toString()} className="flex flex-col gap-0.5">
                    <time
                      dateTime={e.occurredAt.toISOString()}
                      className="text-stone font-mono text-[0.75rem]"
                    >
                      {e.occurredAt.toISOString().replace('T', ' ').slice(0, 19)}
                    </time>
                    <span className="text-charcoal">
                      <span className="font-body text-[0.6875rem] uppercase tracking-[0.06em] text-moss bg-moss/10 rounded px-1.5 py-0.5 mr-1">
                        {e.actionType}
                      </span>
                      <span className="font-body text-[0.6875rem] text-stone mr-1">
                        {e.targetType}
                      </span>
                      {summariseAudit(e.metadata)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Paginator
              basePath={`/ops/users/${user.id}`}
              searchParams={searchParams}
              view={historyView}
              pageParam="hp"
              label="entry"
              labelPlural="entries"
            />
          </section>
        </div>

        <aside className="flex flex-col gap-6">
          <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
            <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-3 flex items-center gap-2">
              <KeyRound size={14} strokeWidth={1.75} className="text-moss" aria-hidden="true" />
              Sign-in methods
            </h2>
            <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-2 text-[0.875rem]">
              <dt className="text-stone">Magic-link</dt>
              <dd className="text-charcoal">Always available</dd>
              <dt className="text-stone">Password</dt>
              <dd className="text-charcoal">
                {user.passwordHash ? (
                  <>
                    Set
                    {user.passwordSetAt ? (
                      <span className="text-stone text-[0.8125rem]">
                        {' '}
                        ({formatDate(user.passwordSetAt)})
                      </span>
                    ) : null}
                  </>
                ) : (
                  'Not set'
                )}
              </dd>
              <dt className="text-stone">Passkeys</dt>
              <dd className="text-charcoal">{user.authenticators.length}</dd>
            </dl>
            {user.authenticators.length > 0 ? (
              <ul className="mt-3 flex flex-col gap-1.5">
                {user.authenticators.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center gap-2 text-[0.8125rem] bg-cream rounded px-2 py-1.5 border border-moss/10"
                  >
                    <Fingerprint
                      size={14}
                      strokeWidth={1.5}
                      className="text-moss flex-shrink-0"
                      aria-hidden="true"
                    />
                    <span className="text-charcoal truncate">
                      {a.nickname || 'Unnamed'}
                    </span>
                    <span className="text-stone ml-auto whitespace-nowrap">
                      {a.lastUsedAt ? `used ${formatDate(a.lastUsedAt)}` : 'never used'}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
            <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-3 flex items-center gap-2">
              <Monitor size={14} strokeWidth={1.75} className="text-moss" aria-hidden="true" />
              Active sessions ({user.sessions.length})
            </h2>
            {user.sessions.length === 0 ? (
              <p className="text-stone text-[0.875rem]">No active sessions.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {user.sessions.map((s) => (
                  <li
                    key={s.id}
                    className="flex flex-col text-[0.8125rem] bg-cream rounded px-2 py-1.5 border border-moss/10"
                  >
                    <span className="text-charcoal">{deviceLabel(s.userAgent)}</span>
                    <span className="text-stone text-[0.75rem]">
                      Active {formatDate(s.lastActiveAt)} · expires {formatDate(s.expires)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function summariseAudit(metadata: unknown): string {
  if (!metadata || typeof metadata !== 'object') return '';
  const m = metadata as Record<string, unknown>;
  if (typeof m.event === 'string') {
    const rest = Object.entries(m)
      .filter(([k]) => k !== 'event' && k !== 'email')
      .map(([k, v]) => `${k}=${typeof v === 'string' ? v : JSON.stringify(v)}`)
      .join(' ');
    return `${m.event}${rest ? ` · ${rest}` : ''}`;
  }
  return JSON.stringify(m);
}
