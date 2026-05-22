import { Settings, LogOut } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { requireOperator } from '@/lib/auth-helpers';
import { signOut } from '@/lib/auth';
import { PasswordSection } from '@/components/account/PasswordSection';
import { PasskeySection } from '@/components/account/PasskeySection';
import { DeviceListSection } from '@/components/account/DeviceListSection';
import { listUserPasskeys } from '@/lib/passkey';
import { listUserSessions } from '@/lib/session';

export const metadata = { title: 'Account' };

const ROLE_LABEL: Record<string, string> = {
  operator_admin: 'Admin',
  operator_coordinator: 'Coordinator',
  operator_safeguarding: 'Safeguarding lead',
  operator_finance: 'Finance',
  operator_read_only: 'Read-only',
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

export default async function OpsAccountPage() {
  const user = await requireOperator('/ops/account');

  const [profile, lastSignIn, passwordInfo, passkeys, sessions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: { createdAt: true },
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
  ]);

  return (
    <div className="max-w-[760px]">
      <header className="mb-6 flex items-center gap-3">
        <Settings size={22} strokeWidth={1.75} className="text-moss" aria-hidden="true" />
        <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1]">
          Your account
        </h1>
      </header>
      <p className="text-charcoal text-[0.9375rem] leading-[1.55] max-w-[60ch] mb-6">
        Manage how you sign in - password, passkeys, and active devices.
        Operator role and other profile details are read-only here; the
        admin promotes or demotes roles directly in the database for now.
      </p>

      <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6 mb-6">
        <h2 className="font-body text-[0.7rem] font-medium uppercase tracking-[0.1em] text-stone mb-3">
          About you
        </h2>
        <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-[0.9375rem]">
          <dt className="text-stone">Name</dt>
          <dd className="text-charcoal">
            {[user.firstName, user.lastName].filter(Boolean).join(' ') || '-'}
          </dd>
          <dt className="text-stone">Email</dt>
          <dd className="text-charcoal break-all font-mono text-[0.875rem]">
            {user.email}
          </dd>
          <dt className="text-stone">Role</dt>
          <dd className="text-charcoal">
            {ROLE_LABEL[user.role] ?? user.role}
          </dd>
          <dt className="text-stone">Joined</dt>
          <dd className="text-charcoal">{formatDate(profile?.createdAt)}</dd>
          <dt className="text-stone">Last signed in</dt>
          <dd className="text-charcoal">
            {lastSignIn ? formatDateTime(lastSignIn.occurredAt) : 'This session'}
          </dd>
        </dl>
      </section>

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
