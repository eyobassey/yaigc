import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth, signOut } from '@/lib/auth';
import { PageShell } from '@/components/marketing/PageShell';
import { Button } from '@/components/ui/Button';

export const metadata: Metadata = {
  title: 'Your account',
  description: 'Your account.',
  robots: { index: false, follow: false },
};

export default async function MePage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/sign-in?callbackUrl=/me');
  }

  const user = session.user;

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
            A smoke-test page until the real account surfaces land.
          </p>

          <dl className="mt-10 bg-paper border border-moss/[0.08] rounded-[20px] p-[clamp(1.75rem,3vw,2.25rem)] grid grid-cols-1 min-[500px]:grid-cols-[max-content_1fr] gap-x-8 gap-y-3 text-[1rem]">
            <dt className="font-medium text-stone">Email</dt>
            <dd className="text-charcoal break-all">{user.email}</dd>
            {user.name ? (
              <>
                <dt className="font-medium text-stone">Name</dt>
                <dd className="text-charcoal">{user.name}</dd>
              </>
            ) : null}
            <dt className="font-medium text-stone">User ID</dt>
            <dd className="text-charcoal font-mono text-[0.875rem] break-all">{user.id}</dd>
          </dl>

          <form
            action={async () => {
              'use server';
              await signOut({ redirectTo: '/' });
            }}
            className="mt-10"
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
