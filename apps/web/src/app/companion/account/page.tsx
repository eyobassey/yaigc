import Link from 'next/link';
import { Settings, LogOut, FileText, ShieldCheck, Wallet, Sparkles } from 'lucide-react';
import { brand } from '@igc/content';
import { prisma } from '@/lib/prisma';
import { requireCompanion } from '@/lib/auth-helpers';
import { signOut } from '@/lib/auth';
import { PasswordSection } from '@/components/account/PasswordSection';
import { PasskeySection } from '@/components/account/PasskeySection';
import { DeviceListSection } from '@/components/account/DeviceListSection';
import { listUserPasskeys } from '@/lib/passkey';
import { listUserSessions } from '@/lib/session';

export const metadata = { title: 'Account' };

const STATUS_LABEL: Record<string, string> = {
  onboarding: 'Onboarding',
  active: 'Active',
  suspended: 'Suspended',
  archived: 'Archived',
};

const ENGAGEMENT_LABEL: Record<string, string> = {
  self_employed: 'Self-employed',
  worker: 'Worker',
  employed: 'Employed',
};

function formatDate(d: Date | null | undefined): string {
  if (!d) return 'Not on file';
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatDateTime(d: Date | null | undefined): string {
  if (!d) return 'Not on file';
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/London',
  });
}

export default async function CompanionAccountPage() {
  const { user, companion } = await requireCompanion('/companion/account');

  // Pull the full companion row so we surface the admin/compliance
  // columns that aren't on requireCompanion's narrower context.
  // Also fetch the most recent sign-in from the audit log (Auth.js
  // writes actionType=auth on every magic-link callback).
  const [full, lastSignIn, passwordInfo, passkeys, sessions, completedVisitsCount] = await Promise.all([
    prisma.companion.findUnique({
      where: { id: companion.id },
      select: {
        engagementType: true,
        hourlyRate: true,
        stripeConnectedAccountId: true,
        dbsCertificateNumber: true,
        dbsIssuedAt: true,
        dbsRenewalDueAt: true,
        insuranceProvider: true,
        insuranceExpiresAt: true,
        driverLicenceNumber: true,
        driverLicenceExpiresAt: true,
        createdAt: true,
        user: { select: { createdAt: true } },
        application: {
          select: {
            motivation: true,
            experienceAlongside: true,
            yearsSettledLocally: true,
            weeklyStabilityNote: true,
          },
        },
      },
    }),
    prisma.auditLogEntry.findFirst({
      where: { actorType: 'user', actorId: user.id, actionType: 'auth' },
      orderBy: { id: 'desc' },
      select: { occurredAt: true },
    }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true, passwordSetAt: true },
    }),
    listUserPasskeys(user.id),
    listUserSessions(user.id),
    prisma.visit.count({
      where: { companionId: companion.id, state: { in: ['completed', 'reported'] } },
    }),
  ]);

  const joinedAt = full?.user.createdAt ?? full?.createdAt ?? null;
  const hourlyRate = full?.hourlyRate ? Number(full.hourlyRate).toFixed(2) : null;
  const payoutsConnected = Boolean(full?.stripeConnectedAccountId);

  // W.1 - Phase 0 panel. Show when any field has a value, or when the
  // companion is established enough (≥1 completed visit) that we'd
  // like to invite them to fill the gaps. Brand-new companions still
  // pre-onboarding see nothing here — the interview captures their
  // answers in person.
  const phaseZero = full?.application ?? null;
  const phaseZeroFilled =
    Boolean(phaseZero?.motivation) ||
    Boolean(phaseZero?.experienceAlongside) ||
    Boolean(phaseZero?.yearsSettledLocally) ||
    Boolean(phaseZero?.weeklyStabilityNote);
  const showPhaseZero = phaseZeroFilled || completedVisitsCount > 0;
  const phaseZeroAnyBlank =
    !phaseZero?.motivation ||
    !phaseZero?.experienceAlongside ||
    !phaseZero?.yearsSettledLocally ||
    !phaseZero?.weeklyStabilityNote;

  return (
    <div className="max-w-[760px]">
      <header className="mb-6 flex items-center gap-3">
        <Settings size={22} strokeWidth={1.75} className="text-moss" aria-hidden="true" />
        <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1]">
          Account
        </h1>
      </header>
      <p className="text-charcoal text-[0.9375rem] leading-[1.55] max-w-[60ch] mb-6">
        What we have on file. To update your bio, photo, interests, or
        availability head to{' '}
        <Link href="/companion/profile" className="link">
          your profile
        </Link>
        . For anything else, give the office a ring.
      </p>

      <Section title="About you">
        <Row label="Name">
          {companion.firstName} {companion.lastName}
        </Row>
        <Row label="Email" mono>
          {user.email}
        </Row>
        <Row label="Status">
          {STATUS_LABEL[companion.status] ?? companion.status}
        </Row>
        <Row label="Joined">{formatDate(joinedAt)}</Row>
        <Row label="Last signed in">
          {lastSignIn ? formatDateTime(lastSignIn.occurredAt) : 'This session'}
        </Row>
      </Section>

      {showPhaseZero ? (
        <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6 mb-6">
          <h2 className="font-body text-[0.7rem] font-medium uppercase tracking-[0.1em] text-stone mb-3 flex items-center gap-2">
            <Sparkles size={12} strokeWidth={1.75} aria-hidden="true" />
            From your application
          </h2>
          <div className="flex flex-col gap-4 text-[0.9375rem]">
            <PhaseZeroBlock
              label="What brings you to this work"
              value={phaseZero?.motivation ?? null}
            />
            <PhaseZeroBlock
              label="A time you were alongside someone"
              value={phaseZero?.experienceAlongside ?? null}
            />
            <PhaseZeroBlock
              label="How long settled in this part of the UK"
              value={phaseZero?.yearsSettledLocally ?? null}
            />
            <PhaseZeroBlock
              label="Weekly stability over six months"
              value={phaseZero?.weeklyStabilityNote ?? null}
            />
          </div>
          {phaseZeroAnyBlank ? (
            <p className="text-stone text-[0.8125rem] italic leading-[1.55] mt-4 pt-4 border-t border-moss/10">
              We did not ask you all of these at the time. If you would like
              to tell us now, drop us a quick email at{' '}
              <a
                href={`mailto:${brand.supportEmail}`}
                className="link not-italic"
              >
                {brand.supportEmail}
              </a>{' '}
              and we will add them to your record.
            </p>
          ) : null}
        </section>
      ) : null}

      <Section title="Where you work">
        <Row label="Borough">{companion.borough.replace(/_/g, ' ')}</Row>
      </Section>

      <Section
        title="How we engage you"
        icon={<Wallet size={12} strokeWidth={1.75} aria-hidden="true" />}
      >
        <Row label="Engagement">
          {full?.engagementType
            ? ENGAGEMENT_LABEL[full.engagementType] ?? full.engagementType
            : 'Not set'}
        </Row>
        <Row label="Hourly rate">
          {hourlyRate ? `£${hourlyRate}` : 'Not set'}
        </Row>
        <Row label="Payouts">
          {payoutsConnected
            ? 'Connected'
            : 'Stripe payouts coming soon - we will email you when it is your turn to set this up.'}
        </Row>
      </Section>

      <Section
        title="Compliance"
        icon={<ShieldCheck size={12} strokeWidth={1.75} aria-hidden="true" />}
      >
        <Row label="DBS certificate">
          {full?.dbsCertificateNumber ? (
            <span className="font-mono">{full.dbsCertificateNumber}</span>
          ) : (
            'Not yet on file'
          )}
        </Row>
        <Row label="DBS issued">{formatDate(full?.dbsIssuedAt)}</Row>
        <Row label="DBS renewal due">{formatDate(full?.dbsRenewalDueAt)}</Row>
        <Row label="Insurance provider">
          {full?.insuranceProvider ?? 'Not on file'}
        </Row>
        <Row label="Insurance expires">
          {formatDate(full?.insuranceExpiresAt)}
        </Row>
        <Row label="Driver's licence">
          {full?.driverLicenceNumber ? (
            <span className="font-mono">{full.driverLicenceNumber}</span>
          ) : (
            'Not on file'
          )}
        </Row>
        <Row label="Licence expires">
          {formatDate(full?.driverLicenceExpiresAt)}
        </Row>
        <div className="col-span-2 pt-2">
          <Link
            href="/companion/documents"
            className="inline-flex items-center gap-2 text-moss hover:text-moss-deep text-[0.875rem]"
          >
            <FileText size={14} strokeWidth={1.75} aria-hidden="true" />
            Manage your documents
          </Link>
        </div>
      </Section>

      <PasswordSection
        hasPassword={Boolean(passwordInfo?.passwordHash)}
        passwordSetAt={
          passwordInfo?.passwordSetAt ? passwordInfo.passwordSetAt.toISOString() : null
        }
      />

      <PasskeySection
        passkeys={passkeys.map((p) => ({
          id: p.id,
          nickname: p.nickname,
          credentialDeviceType: p.credentialDeviceType,
          credentialBackedUp: p.credentialBackedUp,
          createdAt: p.createdAt.toISOString(),
          lastUsedAt: p.lastUsedAt ? p.lastUsedAt.toISOString() : null,
        }))}
      />

      <DeviceListSection
        devices={sessions.map((s) => ({
          id: s.id,
          label: s.label,
          createdAt: s.createdAt.toISOString(),
          lastActiveAt: s.lastActiveAt.toISOString(),
          expires: s.expires.toISOString(),
          isCurrent: s.isCurrent,
        }))}
      />

      <section className="bg-cream-deep/40 border border-moss/[0.08] rounded-[12px] p-5 sm:p-6 mb-6">
        <h2 className="font-body text-[0.7rem] font-medium uppercase tracking-[0.1em] text-stone mb-2">
          Need to change something?
        </h2>
        <p className="text-charcoal text-[0.9375rem] leading-[1.55]">
          Anything on this page is kept up to date by the office. Give us a
          ring and we will sort it together.
        </p>
      </section>

      <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
        <h2 className="font-body text-[0.7rem] font-medium uppercase tracking-[0.1em] text-stone mb-2">
          Sign out
        </h2>
        <p className="text-charcoal text-[0.9375rem] leading-[1.55] mb-4">
          Signed in as <span className="font-mono break-all">{user.email}</span>.
        </p>
        <form
          action={async () => {
            'use server';
            await signOut({ redirectTo: '/' });
          }}
        >
          <button
            type="submit"
            className="inline-flex items-center gap-2 font-body text-[0.875rem] text-paper bg-terracotta hover:bg-terracotta-dark rounded-full px-5 py-2 transition-colors"
          >
            <LogOut size={14} strokeWidth={1.75} aria-hidden="true" />
            Sign out of this device
          </button>
        </form>
      </section>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6 mb-6">
      <h2 className="font-body text-[0.7rem] font-medium uppercase tracking-[0.1em] text-stone mb-3 flex items-center gap-2">
        {icon}
        {title}
      </h2>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-[0.9375rem]">
        {children}
      </dl>
    </section>
  );
}

function Row({
  label,
  children,
  mono,
}: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <>
      <dt className="text-stone">{label}</dt>
      <dd className={`text-charcoal ${mono ? 'break-all font-mono text-[0.875rem]' : ''}`}>
        {children}
      </dd>
    </>
  );
}

function PhaseZeroBlock({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div>
      <div className="font-body text-[0.7rem] font-medium uppercase tracking-[0.08em] text-stone mb-1">
        {label}
      </div>
      {value ? (
        <p className="text-charcoal leading-[1.55] whitespace-pre-wrap break-words">
          {value}
        </p>
      ) : (
        <p className="text-stone italic">—</p>
      )}
    </div>
  );
}
