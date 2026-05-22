import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { signOut } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getSessionUser, defaultLandingForRole } from '@/lib/auth-helpers';
import { PageShell } from '@/components/marketing/PageShell';
import { Button } from '@/components/ui/Button';
import { PasswordSection } from '@/components/account/PasswordSection';
import { PasskeySection } from '@/components/account/PasskeySection';
import { DeviceListSection } from '@/components/account/DeviceListSection';
import { listUserPasskeys } from '@/lib/passkey';
import { listUserSessions } from '@/lib/session';

// /me is the post-sign-in router. Magic-link sign-ins land here when no
// explicit callbackUrl was given, and we forward them to the portal that
// matches their role. The page only renders directly for users whose role
// has no portal yet (rare: a brand-new account before an operator has
// promoted them).

export const metadata: Metadata = {
  title: 'Your account',
  description: 'Your account.',
  robots: { index: false, follow: false },
};

export default async function MePage() {
  const user = await getSessionUser();
  if (!user) {
    redirect('/sign-in?callbackUrl=/me');
  }

  const landing = defaultLandingForRole(user.role);
  if (landing !== '/me') {
    redirect(landing);
  }

  const [passwordInfo, passkeys, sessions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true, passwordSetAt: true },
    }),
    listUserPasskeys(user.id),
    listUserSessions(user.id),
  ]);

  return (
    <PageShell>
      <section className="bg-cream min-h-[calc(100vh-200px)] py-[clamp(4rem,8vw,6rem)]">
        <div className="max-w-[640px] mx-auto px-[clamp(1.25rem,4vw,2.5rem)]">
          <span className="font-body text-[0.8125rem] font-medium uppercase tracking-[0.18em] text-stone mb-6 inline-block">
            Your account
          </span>
          <h1 className="font-head font-normal text-moss text-[clamp(2rem,5vw,3rem)] leading-[1.1] tracking-[-0.025em]">
            You are signed in.
          </h1>
          <p className="font-head italic text-terracotta text-[clamp(1.25rem,2vw,1.5rem)] leading-[1.4] mt-4">
            We have not set up your part of the app yet.
          </p>
          <p className="text-charcoal text-lg leading-[1.6] mt-6 max-w-[48ch]">
            Sit tight - we will reach out as soon as everything is ready.
            Meanwhile if you think you should be seeing something, please
            get in touch.
          </p>

          <dl className="mt-10 bg-paper border border-moss/[0.08] rounded-[20px] p-[clamp(1.75rem,3vw,2.25rem)] grid grid-cols-1 min-[500px]:grid-cols-[max-content_1fr] gap-x-8 gap-y-3 text-[1rem]">
            <dt className="font-medium text-stone">Email</dt>
            <dd className="text-charcoal break-all">{user.email}</dd>
            <dt className="font-medium text-stone">Role</dt>
            <dd className="text-charcoal font-mono text-[0.875rem]">{user.role}</dd>
          </dl>

          <div className="mt-10">
            <PasswordSection
              hasPassword={Boolean(passwordInfo?.passwordHash)}
              passwordSetAt={
                passwordInfo?.passwordSetAt
                  ? passwordInfo.passwordSetAt.toISOString()
                  : null
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
          </div>

          <form
            action={async () => {
              'use server';
              await signOut({ redirectTo: '/' });
            }}
            className="mt-6"
          >
            <Button type="submit" variant="outline" size="small">
              Sign out
            </Button>
          </form>
        </div>
      </section>
    </PageShell>
  );
}
