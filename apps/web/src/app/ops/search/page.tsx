import Link from 'next/link';
import { Inbox, Users, Heart, Search } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { requireOperator } from '@/lib/auth-helpers';

export const metadata = { title: 'Search' };

// Cross-console search. The header form posts here as a plain GET.
// We run four parallel queries (Family / Recipient / Companion /
// Enquiry) using case-insensitive contains, with a small per-type
// limit so a generic query like "Eyo" stays cheap. Results are
// grouped under type sections, each deep-linking back into the
// existing detail pages.

const PER_TYPE_LIMIT = 10;

export default async function OpsSearchPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  await requireOperator('/ops/search');

  const q = (searchParams.q ?? '').trim();

  if (!q) {
    return (
      <div className="max-w-[760px]">
        <Header q="" />
        <p className="text-stone text-[0.9375rem] mt-6">
          Search by name or email - families, recipients, companions, or
          enquiries. Hit return to look.
        </p>
      </div>
    );
  }

  if (q.length < 2) {
    return (
      <div className="max-w-[760px]">
        <Header q={q} />
        <p className="text-stone text-[0.9375rem] mt-6">
          Type at least two characters.
        </p>
      </div>
    );
  }

  const ci = { contains: q, mode: 'insensitive' as const };

  const [families, recipients, companions, enquiries] = await Promise.all([
    prisma.family.findMany({
      where: {
        OR: [
          { billingName: ci },
          { members: { some: { user: { email: ci } } } },
          { members: { some: { user: { firstName: ci } } } },
          { members: { some: { user: { lastName: ci } } } },
        ],
      },
      take: PER_TYPE_LIMIT,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        billingName: true,
        status: true,
        billingCity: true,
      },
    }),
    prisma.recipient.findMany({
      where: {
        OR: [
          { firstName: ci },
          { lastName: ci },
          { preferredName: ci },
        ],
      },
      take: PER_TYPE_LIMIT,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        preferredName: true,
        addressCity: true,
        familyId: true,
        family: { select: { billingName: true } },
      },
    }),
    prisma.companion.findMany({
      where: {
        deletedAt: null,
        OR: [
          { firstName: ci },
          { lastName: ci },
          { user: { email: ci } },
        ],
      },
      take: PER_TYPE_LIMIT,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        applicationId: true,
        firstName: true,
        lastName: true,
        borough: true,
        status: true,
        user: { select: { email: true } },
      },
    }),
    prisma.enquiry.findMany({
      where: {
        OR: [{ name: ci }, { email: ci }],
      },
      take: PER_TYPE_LIMIT,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        createdAt: true,
      },
    }),
  ]);

  const total =
    families.length + recipients.length + companions.length + enquiries.length;

  return (
    <div className="max-w-[860px]">
      <Header q={q} />
      <p className="text-stone text-[0.875rem] mt-2 mb-6">
        {total === 0
          ? `Nothing matches "${q}".`
          : `${total} ${total === 1 ? 'result' : 'results'} for "${q}".`}
      </p>

      {families.length > 0 ? (
        <ResultGroup
          title="Families"
          icon={<Users size={14} strokeWidth={1.75} className="text-moss" aria-hidden="true" />}
        >
          {families.map((f) => (
            <ResultRow
              key={f.id}
              href={`/ops/families/${f.id}`}
              title={f.billingName}
              meta={[f.status.replace(/_/g, ' '), f.billingCity ?? null]}
            />
          ))}
        </ResultGroup>
      ) : null}

      {recipients.length > 0 ? (
        <ResultGroup
          title="Recipients"
          icon={<Heart size={14} strokeWidth={1.75} className="text-moss" aria-hidden="true" />}
        >
          {recipients.map((r) => {
            const display = r.preferredName
              ? `${r.preferredName} (${r.firstName} ${r.lastName})`
              : `${r.firstName} ${r.lastName}`;
            return (
              <ResultRow
                key={r.id}
                href={`/ops/families/${r.familyId}/recipients/${r.id}/edit`}
                title={display}
                meta={[r.family.billingName, r.addressCity ?? null]}
              />
            );
          })}
        </ResultGroup>
      ) : null}

      {companions.length > 0 ? (
        <ResultGroup
          title="Companions"
          icon={<Heart size={14} strokeWidth={1.75} className="text-terracotta" aria-hidden="true" />}
        >
          {companions.map((c) => (
            <ResultRow
              key={c.id}
              href={`/ops/companions/${c.applicationId}`}
              title={`${c.firstName} ${c.lastName}`}
              meta={[
                c.status.replace(/_/g, ' '),
                c.borough.replace(/_/g, ' '),
                c.user.email,
              ]}
            />
          ))}
        </ResultGroup>
      ) : null}

      {enquiries.length > 0 ? (
        <ResultGroup
          title="Enquiries"
          icon={<Inbox size={14} strokeWidth={1.75} className="text-terracotta" aria-hidden="true" />}
        >
          {enquiries.map((e) => (
            <ResultRow
              key={e.id}
              href={`/ops/enquiries/${e.id}`}
              title={e.name}
              meta={[
                e.status.replace(/_/g, ' '),
                e.email,
                e.createdAt.toISOString().slice(0, 10),
              ]}
            />
          ))}
        </ResultGroup>
      ) : null}
    </div>
  );
}

function Header({ q }: { q: string }) {
  return (
    <header>
      <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1] flex items-center gap-3">
        <Search size={20} strokeWidth={1.75} aria-hidden="true" />
        Search
      </h1>
      <form action="/ops/search" method="get" className="mt-4" role="search">
        <input
          type="search"
          name="q"
          autoFocus
          defaultValue={q}
          placeholder="Name or email"
          aria-label="Search query"
          className="w-full max-w-[480px] bg-paper border border-moss/15 rounded-md px-3 py-2 text-charcoal focus:outline-none focus:ring-2 focus:ring-moss/25 focus:border-moss/40"
        />
      </form>
    </header>
  );
}

function ResultGroup({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 mb-5">
      <h2 className="font-body text-[0.7rem] font-medium uppercase tracking-[0.1em] text-stone mb-3 flex items-center gap-2">
        {icon}
        {title}
      </h2>
      <ul className="divide-y divide-moss/[0.06]">{children}</ul>
    </section>
  );
}

function ResultRow({
  href,
  title,
  meta,
}: {
  href: string;
  title: string;
  meta: (string | null | undefined)[];
}) {
  const metaText = meta.filter((m): m is string => Boolean(m)).join(' · ');
  return (
    <li>
      <Link
        href={href}
        className="flex flex-col gap-0.5 py-3 first:pt-0 last:pb-0 hover:opacity-80 transition-opacity"
      >
        <span className="text-charcoal text-[0.9375rem] font-medium">
          {title}
        </span>
        {metaText ? (
          <span className="text-stone text-[0.8125rem] capitalize">
            {metaText}
          </span>
        ) : null}
      </Link>
    </li>
  );
}
