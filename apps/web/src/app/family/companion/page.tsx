import { Heart, MapPin } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { requireFamilyMember } from '@/lib/auth-helpers';
import { companionPhotoSrc } from '@/lib/companion-photo-src';

export const metadata = { title: 'Your companion' };

// Family-facing view of the companion(s) matched with the household.
// Per SDD §12.3.4 only first-name + photo + bio + borough are surfaced
// here; last name, email, phone, DBS, hourly rate and other PII are
// operator-only. The companion is identified via two paths:
//   1. Active/paused Subscription (the booking is set up)
//   2. Accepted Match without a subscription yet (operator is mid-set-up)

export default async function FamilyCompanionPage() {
  const { family } = await requireFamilyMember('/family/companion');

  const [activeSubs, openMatches] = await Promise.all([
    prisma.subscription.findMany({
      where: {
        familyId: family.id,
        status: { in: ['active', 'paused'] },
      },
      include: {
        companion: {
          select: { id: true, firstName: true, bio: true, photoUrl: true, photoFilename: true, borough: true },
        },
        recipient: { select: { firstName: true, preferredName: true } },
      },
      orderBy: { startedAt: 'asc' },
    }),
    prisma.match.findMany({
      where: {
        familyId: family.id,
        status: 'accepted',
        subscription: null,
      },
      include: {
        companion: {
          select: { id: true, firstName: true, bio: true, photoUrl: true, photoFilename: true, borough: true },
        },
        recipient: { select: { firstName: true, preferredName: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  type Pair = {
    key: string;
    companion: {
      id: string;
      firstName: string;
      bio: string | null;
      photoUrl: string | null;
      photoFilename: string | null;
      borough: string;
    };
    recipientLabel: string;
    state: 'active' | 'paused' | 'matched';
  };

  const pairs: Pair[] = [
    ...activeSubs.map((s) => ({
      key: `sub-${s.id}`,
      companion: s.companion,
      recipientLabel: s.recipient.preferredName || s.recipient.firstName,
      state: s.status as 'active' | 'paused',
    })),
    ...openMatches.map((m) => ({
      key: `match-${m.id}`,
      companion: m.companion,
      recipientLabel:
        m.recipient?.preferredName || m.recipient?.firstName || 'your household',
      state: 'matched' as const,
    })),
  ];

  return (
    <div>
      <header className="mb-6 flex items-center gap-3">
        <Heart size={22} strokeWidth={1.75} className="text-terracotta" aria-hidden="true" />
        <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1]">
          Your companion
        </h1>
      </header>

      {pairs.length === 0 ? (
        <p className="text-charcoal text-[0.9375rem] leading-[1.55] max-w-[60ch]">
          We have not finalised a match yet. We take this part slowly - the
          fit matters. As soon as we have someone in mind, we will email
          you a short profile to look over.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {pairs.map((p) => (
            <article
              key={p.key}
              className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6 flex flex-col sm:flex-row gap-5"
            >
              <div className="flex-shrink-0">
                {companionPhotoSrc(p.companion) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={companionPhotoSrc(p.companion)!}
                    alt={`Photo of ${p.companion.firstName}`}
                    width="120"
                    height="120"
                    className="w-[120px] h-[120px] rounded-full object-cover border border-moss/15"
                  />
                ) : (
                  <div className="w-[120px] h-[120px] rounded-full bg-moss/10 flex items-center justify-center">
                    <Heart size={32} strokeWidth={1.5} className="text-moss/40" aria-hidden="true" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <StatusPill state={p.state} />
                  <span className="text-stone text-[0.8125rem]">
                    visiting {p.recipientLabel}
                  </span>
                </div>
                <h2 className="font-head text-moss text-[clamp(1.5rem,3vw,1.875rem)] font-medium leading-[1.15] mb-2">
                  {p.companion.firstName}
                </h2>
                <p className="inline-flex items-center gap-1.5 text-stone text-[0.875rem] mb-3">
                  <MapPin size={14} strokeWidth={1.75} aria-hidden="true" />
                  {p.companion.borough.replace(/_/g, ' ')}
                </p>
                {p.companion.bio ? (
                  <p className="text-charcoal leading-[1.6] whitespace-pre-wrap break-words">
                    {p.companion.bio}
                  </p>
                ) : (
                  <p className="text-stone text-[0.9375rem] italic">
                    {p.companion.firstName} has not shared a bio yet.
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusPill({ state }: { state: 'active' | 'paused' | 'matched' }) {
  const map = {
    active: { label: 'Booking active', cls: 'bg-moss/15 text-moss' },
    paused: { label: 'Booking paused', cls: 'bg-terracotta/15 text-terracotta' },
    matched: { label: 'Matched - setting up', cls: 'bg-moss/15 text-moss' },
  };
  const x = map[state];
  return (
    <span
      className={`inline-flex items-center font-body text-[0.65rem] font-medium uppercase tracking-[0.08em] px-2 py-0.5 rounded ${x.cls}`}
    >
      {x.label}
    </span>
  );
}
