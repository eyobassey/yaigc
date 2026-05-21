import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { brand } from '@igc/content';
import { signOut } from '@/lib/auth';
import { getSessionUser, isCompanion, isOperator, isFamily } from '@/lib/auth-helpers';
import { PageShell } from '@/components/marketing/PageShell';
import { Button } from '@/components/ui/Button';

// Placeholder for the companion portal. Phase 2 will replace this with
// the actual surface (today's visit, state transitions, post-visit
// report submission, payouts). For now any signed-in companion lands
// here and sees a friendly note.

export const metadata: Metadata = {
  title: 'Your account',
  robots: { index: false, follow: false },
};

export default async function CompanionPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect('/sign-in?callbackUrl=/companion');
  }
  if (isOperator(user.role)) redirect('/ops');
  if (isFamily(user.role)) redirect('/family');
  if (!isCompanion(user.role)) redirect('/no-access');

  return (
    <PageShell>
      <section className="bg-cream min-h-[calc(100vh-200px)] py-[clamp(4rem,8vw,6rem)]">
        <div className="max-w-[640px] mx-auto px-[clamp(1.25rem,4vw,2.5rem)]">
          <span className="font-body text-[0.8125rem] font-medium uppercase tracking-[0.18em] text-stone mb-6 inline-block">
            Companion account
          </span>
          <h1 className="font-head font-normal text-moss text-[clamp(2rem,5vw,3rem)] leading-[1.1] tracking-[-0.025em]">
            You are signed in.
          </h1>
          <p className="font-head italic text-terracotta text-[clamp(1.25rem,2vw,1.5rem)] leading-[1.4] mt-4">
            Your portal is coming soon.
          </p>
          <p className="text-charcoal text-lg leading-[1.6] mt-6 max-w-[48ch]">
            For now, we run things from our side. If you have a visit
            coming up, you will get all the details by email. When you
            are at the visit, ring us and we will move it through the
            stages on your behalf. The portal that lets you do this
            yourself is the next thing we are building.
          </p>

          <dl className="mt-10 bg-paper border border-moss/[0.08] rounded-[20px] p-[clamp(1.75rem,3vw,2.25rem)] grid grid-cols-1 min-[500px]:grid-cols-[max-content_1fr] gap-x-8 gap-y-3 text-[1rem]">
            <dt className="font-medium text-stone">Email</dt>
            <dd className="text-charcoal break-all">{user.email}</dd>
            {user.firstName || user.lastName ? (
              <>
                <dt className="font-medium text-stone">Name</dt>
                <dd className="text-charcoal">
                  {`${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()}
                </dd>
              </>
            ) : null}
          </dl>

          <p className="mt-10 text-charcoal text-[0.9375rem] leading-[1.55]">
            Questions? Call us on{' '}
            <a href={`tel:${brand.supportPhone.replace(/\s/g, '')}`} className="link">
              {brand.supportPhone}
            </a>
            .
          </p>

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
