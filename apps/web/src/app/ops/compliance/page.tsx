import Link from 'next/link';
import { ShieldCheck, AlertTriangle } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { requireOperator } from '@/lib/auth-helpers';

export const metadata = { title: 'Compliance' };

// Operator-facing compliance roll-up. Companions and their two
// expiring credentials (DBS, insurance) are not surfaced anywhere
// else as a list - the data lives on the companion edit page. This
// dashboard helps the office spot what is about to lapse, plus what
// is missing entirely, so they can chase it before a visit is at
// risk.

interface CompanionLite {
  id: string;
  applicationId: string;
  firstName: string;
  lastName: string;
  borough: string;
  dbsRenewalDueAt: Date | null;
  insuranceExpiresAt: Date | null;
  insuranceProvider: string | null;
  dbsCertificateNumber: string | null;
}

function daysBetween(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

function formatDate(d: Date | null): string {
  if (!d) return '-';
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default async function OpsCompliancePage() {
  await requireOperator('/ops/compliance');

  const today = new Date();
  const in90 = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);

  const companions = (await prisma.companion.findMany({
    where: { deletedAt: null, status: { in: ['onboarding', 'active'] } },
    orderBy: [{ status: 'asc' }, { firstName: 'asc' }],
    select: {
      id: true,
      applicationId: true,
      firstName: true,
      lastName: true,
      borough: true,
      dbsRenewalDueAt: true,
      insuranceExpiresAt: true,
      insuranceProvider: true,
      dbsCertificateNumber: true,
    },
  })) as CompanionLite[];

  // Bucket each companion by their most-urgent issue. A single row
  // appears in at most one bucket (so an expired DBS and expiring
  // insurance both show on the "expired" row), and we annotate which
  // credentials are in trouble so the office can act on the right one.
  type RowFlag = { kind: 'dbs' | 'insurance'; daysFromToday: number | null };
  type Row = { c: CompanionLite; flags: RowFlag[]; severity: number };

  const rows: Row[] = [];
  for (const c of companions) {
    const flags: RowFlag[] = [];
    // DBS
    if (!c.dbsCertificateNumber || !c.dbsRenewalDueAt) {
      flags.push({ kind: 'dbs', daysFromToday: null });
    } else if (c.dbsRenewalDueAt <= in90) {
      flags.push({
        kind: 'dbs',
        daysFromToday: daysBetween(today, c.dbsRenewalDueAt),
      });
    }
    // Insurance
    if (!c.insuranceExpiresAt) {
      flags.push({ kind: 'insurance', daysFromToday: null });
    } else if (c.insuranceExpiresAt <= in90) {
      flags.push({
        kind: 'insurance',
        daysFromToday: daysBetween(today, c.insuranceExpiresAt),
      });
    }
    if (flags.length === 0) continue;
    // Severity: 0 = missing, 1 = expired, 2 = <=30, 3 = <=90
    const severity = Math.min(
      ...flags.map((f) =>
        f.daysFromToday === null
          ? 0
          : f.daysFromToday < 0
          ? 1
          : f.daysFromToday <= 30
          ? 2
          : 3,
      ),
    );
    rows.push({ c, flags, severity });
  }
  rows.sort((a, b) => a.severity - b.severity);

  const missing = rows.filter((r) => r.severity === 0);
  const expired = rows.filter((r) => r.severity === 1);
  const within30 = rows.filter((r) => r.severity === 2);
  const within90 = rows.filter((r) => r.severity === 3);

  return (
    <div className="max-w-[1100px]">
      <header className="mb-6 flex items-center gap-3">
        <ShieldCheck size={22} strokeWidth={1.75} className="text-moss" aria-hidden="true" />
        <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1]">
          Compliance
        </h1>
      </header>
      <p className="text-charcoal text-[0.9375rem] leading-[1.55] max-w-[70ch] mb-6">
        DBS and insurance status across active and onboarding companions.
        Companies that are suspended or archived are excluded.
      </p>

      <div className="grid sm:grid-cols-4 gap-3 mb-8">
        <SummaryTile
          tone="red"
          label="Expired"
          count={expired.length}
          hint="Already past renewal"
        />
        <SummaryTile
          tone="amber"
          label="Within 30 days"
          count={within30.length}
          hint="Chase now"
        />
        <SummaryTile
          tone="amber"
          label="Within 90 days"
          count={within90.length}
          hint="On the horizon"
        />
        <SummaryTile
          tone="stone"
          label="Missing on file"
          count={missing.length}
          hint="Not yet recorded"
        />
      </div>

      <Bucket
        title="Expired"
        intro="DBS or insurance has already passed its renewal date. Take these out of rotation until renewed."
        tone="red"
        rows={expired}
      />
      <Bucket
        title="Expiring within 30 days"
        intro="Renew soon. Reach out before the date so visits are not interrupted."
        tone="amber"
        rows={within30}
      />
      <Bucket
        title="Expiring within 90 days"
        intro="On the horizon. Worth a heads-up at the next catch-up."
        tone="amber"
        rows={within90}
      />
      <Bucket
        title="Missing from file"
        intro="No certificate or expiry on record. Capture these on the companion edit page so the dashboard can track them."
        tone="stone"
        rows={missing}
      />

      {rows.length === 0 ? (
        <p className="text-stone text-[0.9375rem] italic mt-6">
          Nothing to chase. All active companions have current DBS and
          insurance on file.
        </p>
      ) : null}
    </div>
  );
}

function SummaryTile({
  tone,
  label,
  count,
  hint,
}: {
  tone: 'red' | 'amber' | 'stone';
  label: string;
  count: number;
  hint: string;
}) {
  const toneClass =
    tone === 'red'
      ? 'border-red-300/60 bg-red-50/40'
      : tone === 'amber'
      ? 'border-amber-300/60 bg-amber-50/40'
      : 'border-moss/10 bg-cream';
  const accent =
    tone === 'red'
      ? 'text-red-700'
      : tone === 'amber'
      ? 'text-amber-700'
      : 'text-stone';
  return (
    <div className={`border rounded-[12px] p-4 ${toneClass}`}>
      <div className={`font-body text-[0.7rem] font-medium uppercase tracking-[0.1em] ${accent} mb-2`}>
        {label}
      </div>
      <div className="font-head text-moss text-[2.25rem] leading-none mb-1">
        {count}
      </div>
      <div className="text-stone text-[0.8125rem]">{hint}</div>
    </div>
  );
}

function Bucket({
  title,
  intro,
  tone,
  rows,
}: {
  title: string;
  intro: string;
  tone: 'red' | 'amber' | 'stone';
  rows: { c: CompanionLite; flags: { kind: 'dbs' | 'insurance'; daysFromToday: number | null }[]; severity: number }[];
}) {
  if (rows.length === 0) return null;
  const titleAccent =
    tone === 'red'
      ? 'text-red-700'
      : tone === 'amber'
      ? 'text-amber-700'
      : 'text-stone';
  return (
    <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6 mb-6">
      <h2 className={`font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] mb-1 flex items-center gap-2 ${titleAccent}`}>
        {tone === 'red' ? (
          <AlertTriangle size={14} strokeWidth={2} aria-hidden="true" />
        ) : null}
        {title} ({rows.length})
      </h2>
      <p className="text-stone text-[0.875rem] mb-4">{intro}</p>
      <ul className="divide-y divide-moss/[0.06]">
        {rows.map(({ c, flags }) => (
          <li key={c.id} className="py-3 first:pt-0 last:pb-0">
            <Link
              href={`/ops/companions/${c.applicationId}`}
              className="flex items-start justify-between gap-3 hover:opacity-80 transition-opacity"
            >
              <div className="min-w-0">
                <div className="text-charcoal text-[0.9375rem] font-medium">
                  {c.firstName} {c.lastName}
                </div>
                <div className="text-stone text-[0.8125rem] capitalize">
                  {c.borough.replace(/_/g, ' ')}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                {flags.map((f) => (
                  <FlagBadge
                    key={f.kind}
                    kind={f.kind}
                    days={f.daysFromToday}
                    dbsDue={c.dbsRenewalDueAt}
                    insuranceDue={c.insuranceExpiresAt}
                  />
                ))}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function FlagBadge({
  kind,
  days,
  dbsDue,
  insuranceDue,
}: {
  kind: 'dbs' | 'insurance';
  days: number | null;
  dbsDue: Date | null;
  insuranceDue: Date | null;
}) {
  const due = kind === 'dbs' ? dbsDue : insuranceDue;
  const label = kind === 'dbs' ? 'DBS' : 'Insurance';
  let cls = 'bg-stone/10 text-stone';
  let text = `${label} - missing`;
  if (days !== null) {
    if (days < 0) {
      cls = 'bg-red-100 text-red-800';
      text = `${label} expired (${formatDate(due)})`;
    } else if (days <= 30) {
      cls = 'bg-amber-100 text-amber-800';
      text = `${label} due in ${days}d (${formatDate(due)})`;
    } else {
      cls = 'bg-amber-50 text-amber-700';
      text = `${label} due ${formatDate(due)}`;
    }
  }
  return (
    <span
      className={`inline-flex items-center font-body text-[0.7rem] font-medium px-2 py-0.5 rounded ${cls} whitespace-nowrap`}
    >
      {text}
    </span>
  );
}
