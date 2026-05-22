import Link from 'next/link';
import { User, Users, Plus } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { requireFamilyMember } from '@/lib/auth-helpers';
import { AccountForm } from './AccountForm';

export const metadata = { title: 'Account' };

const RELATIONSHIP_LABEL: Record<string, string> = {
  daughter: 'Daughter',
  son: 'Son',
  partner: 'Partner',
  spouse: 'Spouse',
  sibling: 'Sibling',
  grandchild: 'Grandchild',
  other: 'Other',
};

export default async function FamilyAccountPage({
  searchParams,
}: {
  searchParams: { invited?: string };
}) {
  const { user, member, family } = await requireFamilyMember('/family/account');
  const justInvited = searchParams.invited === '1';

  // Payer can edit; viewers (Phase 2) get a read-only view.
  const isPayer = member.role === 'payer';

  // Latest sign-in for this user (audit log is the source of truth -
  // Auth.js logs every successful magic-link callback as actionType=auth,
  // metadata.event=sign_in).
  const [lastSignIn, otherMembers] = await Promise.all([
    prisma.auditLogEntry.findFirst({
      where: {
        actorType: 'user',
        actorId: user.id,
        actionType: 'auth',
      },
      orderBy: { id: 'desc' },
      select: { occurredAt: true },
    }),
    prisma.familyMember.findMany({
      where: { familyId: family.id, id: { not: member.id }, deletedAt: null },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { addedAt: 'asc' },
    }),
  ]);

  return (
    <div className="max-w-[680px]">
      <header className="mb-6 flex items-center gap-3">
        <User size={22} strokeWidth={1.75} className="text-moss" aria-hidden="true" />
        <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1]">
          Account
        </h1>
      </header>

      <dl className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6 grid grid-cols-[max-content_1fr] gap-x-6 gap-y-3 text-[0.9375rem] mb-6">
        <dt className="text-stone">Household</dt>
        <dd className="text-charcoal break-words">{family.billingName}</dd>
        <dt className="text-stone">Joined</dt>
        <dd className="text-charcoal">{formatDate(family.joinedAt)}</dd>
        <dt className="text-stone">Email</dt>
        <dd className="text-charcoal break-all">{user.email}</dd>
        <dt className="text-stone">Role</dt>
        <dd className="text-charcoal capitalize">{member.role}</dd>
        {member.relationshipToRecipient ? (
          <>
            <dt className="text-stone">Relationship</dt>
            <dd className="text-charcoal">
              {RELATIONSHIP_LABEL[member.relationshipToRecipient] ??
                member.relationshipToRecipient}
            </dd>
          </>
        ) : null}
        {member.isPrimaryContact ? (
          <>
            <dt className="text-stone">Primary contact</dt>
            <dd className="text-charcoal">Yes - we ring you first</dd>
          </>
        ) : null}
        <dt className="text-stone">Last signed in</dt>
        <dd className="text-charcoal">
          {lastSignIn ? formatRelative(lastSignIn.occurredAt) : 'not recorded'}
        </dd>
      </dl>

      {justInvited ? (
        <div className="mb-6 bg-moss/5 border-l-4 border-moss px-5 py-4 rounded-r">
          <p className="font-body text-[0.7rem] font-medium uppercase tracking-[0.12em] text-moss mb-1">
            Invite sent
          </p>
          <p className="text-charcoal text-[0.9375rem] leading-[1.55]">
            They will see a one-time sign-in link in their inbox shortly.
          </p>
        </div>
      ) : null}

      <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6 mb-6">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
          <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone inline-flex items-center gap-2">
            <Users size={14} strokeWidth={1.75} className="text-moss" aria-hidden="true" />
            Other people on this household ({otherMembers.length})
          </h2>
          {isPayer ? (
            <Link
              href="/family/account/invite"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-moss/20 text-moss text-[0.75rem] font-medium hover:bg-moss hover:text-cream transition-colors whitespace-nowrap"
            >
              <Plus size={12} strokeWidth={2} aria-hidden="true" />
              Invite someone
            </Link>
          ) : null}
        </div>
        {otherMembers.length === 0 ? (
          <p className="text-stone text-[0.9375rem] leading-[1.55]">
            You are the only one on the account right now. Click{' '}
            <strong>Invite someone</strong> above to loop in a partner,
            sibling, or grown-up child.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {otherMembers.map((m) => {
              const name =
                `${m.user.firstName ?? ''} ${m.user.lastName ?? ''}`.trim() ||
                m.user.email;
              return (
                <li key={m.id} className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="font-head text-moss text-[1rem] font-medium break-words">
                      {name}
                    </div>
                    <div className="text-stone text-[0.8125rem]">
                      {m.role}
                      {m.relationshipToRecipient
                        ? ` · ${RELATIONSHIP_LABEL[m.relationshipToRecipient] ?? m.relationshipToRecipient}`
                        : ''}
                      {m.isPrimaryContact ? ' · primary contact' : ''}
                    </div>
                  </div>
                  <a
                    href={`mailto:${m.user.email}`}
                    className="link text-[0.8125rem] break-all"
                  >
                    {m.user.email}
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {isPayer ? (
        <AccountForm
          firstName={user.firstName ?? ''}
          lastName={user.lastName ?? ''}
          relationshipToRecipient={member.relationshipToRecipient ?? ''}
        />
      ) : (
        <p className="text-stone text-[0.9375rem] leading-[1.55]">
          Editing on the household account is reserved for the payer. If
          you need to change your details, ask them to do it or reach us
          directly.
        </p>
      )}
    </div>
  );
}

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

function formatRelative(d: Date): string {
  const ms = Date.now() - d.getTime();
  const m = Math.floor(ms / 60000);
  if (m < 2) return 'just now';
  if (m < 60) return `${m} minutes ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return formatDate(d);
}
