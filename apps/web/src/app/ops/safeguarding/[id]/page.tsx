import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, ChevronRight, ShieldAlert } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth-helpers';
import {
  transitionCase,
  assignCase,
  updateCaseSeverity,
  addCaseNote,
} from '@/lib/safeguarding';
import { SeverityPill, StatusPill } from '../page';
import { CloseForm } from './CloseForm';

export const metadata = { title: 'Safeguarding case' };

const CLOSURE_LABEL: Record<string, string> = {
  no_action_needed: 'No action needed',
  followed_up_with_family: 'Followed up with family',
  followed_up_with_companion: 'Followed up with companion',
  companion_removed: 'Companion removed from platform',
  external_referral: 'External referral',
  other: 'Other',
};

export default async function SafeguardingCaseDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const c = await prisma.safeguardingCase.findUnique({
    where: { id: params.id },
    include: {
      subjectRecipient: {
        select: { id: true, firstName: true, lastName: true, preferredName: true, familyId: true },
      },
      relatedVisit: { select: { id: true, scheduledStartAt: true } },
      relatedReport: { select: { id: true, visitId: true } },
      relatedMatch: { select: { id: true } },
      openedBy: { select: { firstName: true, lastName: true, email: true } },
      closedBy: { select: { firstName: true, lastName: true, email: true } },
      assignedTo: { select: { firstName: true, lastName: true, email: true } },
      notes: {
        orderBy: { createdAt: 'asc' },
        include: { author: { select: { firstName: true, lastName: true, email: true } } },
      },
    },
  });
  if (!c) notFound();

  const me = await getSessionUser();

  const operators = await prisma.user.findMany({
    where: {
      role: {
        in: [
          'operator_coordinator',
          'operator_safeguarding',
          'operator_finance',
          'operator_admin',
        ],
      },
      deletedAt: null,
    },
    select: { id: true, firstName: true, lastName: true, email: true },
    orderBy: [{ firstName: 'asc' }],
  });

  const subjectName = c.subjectRecipient
    ? c.subjectRecipient.preferredName
      ? `${c.subjectRecipient.firstName} ${c.subjectRecipient.lastName} (known as ${c.subjectRecipient.preferredName})`
      : `${c.subjectRecipient.firstName} ${c.subjectRecipient.lastName}`
    : null;
  const openedByLabel = c.openedBy
    ? `${c.openedBy.firstName ?? ''} ${c.openedBy.lastName ?? ''}`.trim() || c.openedBy.email
    : 'System (auto-opened)';

  return (
    <div>
      <Link
        href="/ops/safeguarding"
        className="inline-flex items-center gap-1 text-stone hover:text-moss text-sm mb-4 transition-colors"
      >
        <ChevronLeft size={14} strokeWidth={1.75} aria-hidden="true" />
        All cases
      </Link>

      <header className="mb-6">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <ShieldAlert size={18} strokeWidth={1.75} className="text-red-700" aria-hidden="true" />
          <SeverityPill severity={c.severity} />
          <StatusPill status={c.status} />
          <time
            dateTime={c.openedAt.toISOString()}
            className="text-stone text-[0.8125rem] font-mono"
          >
            opened {c.openedAt.toISOString().replace('T', ' ').slice(0, 19)}
          </time>
          <span className="text-stone text-[0.8125rem]">by {openedByLabel}</span>
        </div>
        <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1] break-words">
          {subjectName ?? 'Case without a named subject'}
        </h1>
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-6">
          <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
            <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-3">
              Summary
            </h2>
            <p className="text-charcoal leading-[1.65] whitespace-pre-wrap break-words">{c.summary}</p>
          </section>

          {(c.relatedVisit || c.relatedReport || c.relatedMatch || c.subjectRecipient) ? (
            <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
              <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-3">
                Related
              </h2>
              <ul className="flex flex-col gap-2 text-[0.9375rem]">
                {c.subjectRecipient ? (
                  <li>
                    <Link
                      href={`/ops/families/${c.subjectRecipient.familyId}`}
                      className="link inline-flex items-center gap-1"
                    >
                      Family of {subjectName}
                      <ChevronRight size={14} strokeWidth={1.75} aria-hidden="true" />
                    </Link>
                  </li>
                ) : null}
                {c.relatedVisit ? (
                  <li>
                    <Link
                      href={`/ops/visits/${c.relatedVisit.id}`}
                      className="link inline-flex items-center gap-1"
                    >
                      Visit on {c.relatedVisit.scheduledStartAt.toISOString().slice(0, 10)}
                      <ChevronRight size={14} strokeWidth={1.75} aria-hidden="true" />
                    </Link>
                  </li>
                ) : null}
                {c.relatedReport ? (
                  <li>
                    <Link
                      href={`/ops/visits/${c.relatedReport.visitId}`}
                      className="link inline-flex items-center gap-1"
                    >
                      Post-visit report
                      <ChevronRight size={14} strokeWidth={1.75} aria-hidden="true" />
                    </Link>
                  </li>
                ) : null}
                {c.relatedMatch ? (
                  <li>
                    <Link
                      href={`/ops/matches/${c.relatedMatch.id}`}
                      className="link inline-flex items-center gap-1"
                    >
                      Ended match
                      <ChevronRight size={14} strokeWidth={1.75} aria-hidden="true" />
                    </Link>
                  </li>
                ) : null}
              </ul>
            </section>
          ) : null}

          <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
            <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-3">
              Case-note thread ({c.notes.length})
            </h2>
            {c.notes.length === 0 ? (
              <p className="text-stone text-sm mb-4">No notes yet.</p>
            ) : (
              <ul className="flex flex-col gap-4 mb-4">
                {c.notes.map((n) => {
                  const authorLabel = n.author
                    ? `${n.author.firstName ?? ''} ${n.author.lastName ?? ''}`.trim() || n.author.email
                    : 'System';
                  return (
                    <li key={n.id} className="border-l-2 border-moss/20 pl-3">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-body text-[0.7rem] font-medium uppercase tracking-[0.08em] text-stone">
                          {authorLabel}
                        </span>
                        <time
                          dateTime={n.createdAt.toISOString()}
                          className="text-stone text-[0.75rem] font-mono"
                        >
                          {n.createdAt.toISOString().replace('T', ' ').slice(0, 19)}
                        </time>
                      </div>
                      <p className="text-charcoal leading-[1.55] whitespace-pre-wrap break-words">{n.body}</p>
                    </li>
                  );
                })}
              </ul>
            )}
            {c.status !== 'closed' ? (
              <form action={addCaseNote} className="flex flex-col gap-2 pt-3 border-t border-moss/10">
                <input type="hidden" name="caseId" value={c.id} />
                <textarea
                  name="body"
                  rows={3}
                  required
                  maxLength={4000}
                  placeholder="Add a note to the thread."
                  className="bg-cream border border-moss/15 rounded-md px-3 py-2 text-charcoal text-[0.875rem] placeholder:text-stone/60 focus:border-moss focus:outline-none focus:ring-2 focus:ring-moss/20 resize-y"
                />
                <button
                  type="submit"
                  className="self-start inline-flex items-center justify-center px-4 py-2 rounded-md bg-moss text-cream text-[0.875rem] font-medium hover:bg-moss-dark transition-colors"
                >
                  Add note
                </button>
              </form>
            ) : null}
          </section>

          {c.status === 'closed' && c.closureCategory ? (
            <section className="bg-charcoal/5 border-l-4 border-charcoal/30 px-5 py-4 rounded-r">
              <h2 className="font-body text-[0.7rem] font-medium uppercase tracking-[0.1em] text-charcoal mb-2">
                Case closed
              </h2>
              <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-[0.875rem]">
                <dt className="text-stone">Category</dt>
                <dd className="text-charcoal">{CLOSURE_LABEL[c.closureCategory] ?? c.closureCategory}</dd>
                {c.closedAt ? (
                  <>
                    <dt className="text-stone">Closed</dt>
                    <dd className="text-charcoal font-mono text-[0.8125rem]">
                      {c.closedAt.toISOString().replace('T', ' ').slice(0, 19)}
                    </dd>
                  </>
                ) : null}
                {c.closedBy ? (
                  <>
                    <dt className="text-stone">Closed by</dt>
                    <dd className="text-charcoal">
                      {`${c.closedBy.firstName ?? ''} ${c.closedBy.lastName ?? ''}`.trim() || c.closedBy.email}
                    </dd>
                  </>
                ) : null}
                {c.closureNote ? (
                  <>
                    <dt className="text-stone">Note</dt>
                    <dd className="text-charcoal whitespace-pre-wrap break-words">{c.closureNote}</dd>
                  </>
                ) : null}
              </dl>
            </section>
          ) : null}
        </div>

        <aside className="flex flex-col gap-6">
          {c.status !== 'closed' ? (
            <>
              <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
                <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-3">
                  Status
                </h2>
                <form action={transitionCase} className="flex flex-col gap-2">
                  <input type="hidden" name="caseId" value={c.id} />
                  {c.status === 'open' ? (
                    <button
                      type="submit"
                      name="to"
                      value="under_review"
                      className="inline-flex items-center justify-center px-3 py-1.5 rounded-md bg-moss text-cream text-[0.8125rem] font-medium hover:bg-moss-dark transition-colors"
                    >
                      Mark under review
                    </button>
                  ) : null}
                  {c.status === 'under_review' || c.status === 'open' ? (
                    <button
                      type="submit"
                      name="to"
                      value="actioned"
                      className="inline-flex items-center justify-center px-3 py-1.5 rounded-md border border-moss/30 text-moss text-[0.8125rem] font-medium hover:bg-moss hover:text-cream transition-colors"
                    >
                      Mark actioned
                    </button>
                  ) : null}
                  {c.status === 'actioned' ? (
                    <button
                      type="submit"
                      name="to"
                      value="under_review"
                      className="inline-flex items-center justify-center px-3 py-1.5 rounded-md border border-moss/30 text-moss text-[0.8125rem] font-medium hover:bg-moss hover:text-cream transition-colors"
                    >
                      Back to under review
                    </button>
                  ) : null}
                </form>
              </section>

              <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
                <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-3">
                  Severity
                </h2>
                <form action={updateCaseSeverity} className="flex flex-col gap-2">
                  <input type="hidden" name="caseId" value={c.id} />
                  <select
                    name="severity"
                    defaultValue={c.severity}
                    className="bg-cream border border-moss/15 rounded-md px-3 py-2 text-charcoal text-[0.875rem] focus:border-moss focus:outline-none focus:ring-2 focus:ring-moss/20"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                  <button
                    type="submit"
                    className="self-start inline-flex items-center justify-center px-3 py-1.5 rounded-md border border-moss/30 text-moss text-[0.8125rem] font-medium hover:bg-moss hover:text-cream transition-colors"
                  >
                    Update severity
                  </button>
                </form>
              </section>

              <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
                <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-3">
                  Assignment
                </h2>
                <p className="text-stone text-[0.875rem] mb-2">
                  {c.assignedTo
                    ? `Assigned to ${`${c.assignedTo.firstName ?? ''} ${c.assignedTo.lastName ?? ''}`.trim() || c.assignedTo.email}`
                    : 'Unassigned'}
                </p>
                <form action={assignCase} className="flex flex-col gap-2">
                  <input type="hidden" name="caseId" value={c.id} />
                  <select
                    name="assignedToOperatorId"
                    defaultValue={c.assignedToOperatorId ?? ''}
                    className="bg-cream border border-moss/15 rounded-md px-3 py-2 text-charcoal text-[0.875rem] focus:border-moss focus:outline-none focus:ring-2 focus:ring-moss/20"
                  >
                    <option value="">- unassigned -</option>
                    {me ? <option value="me">Me ({me.email})</option> : null}
                    {operators.map((o) => (
                      <option key={o.id} value={o.id}>
                        {`${o.firstName ?? ''} ${o.lastName ?? ''}`.trim() || o.email}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="self-start inline-flex items-center justify-center px-3 py-1.5 rounded-md border border-moss/30 text-moss text-[0.8125rem] font-medium hover:bg-moss hover:text-cream transition-colors"
                  >
                    Update
                  </button>
                </form>
              </section>

              <CloseForm caseId={c.id} />
            </>
          ) : (
            <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
              <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-2">
                Reopen
              </h2>
              <form action={transitionCase}>
                <input type="hidden" name="caseId" value={c.id} />
                <button
                  type="submit"
                  name="to"
                  value="open"
                  className="inline-flex items-center justify-center px-3 py-1.5 rounded-md border border-moss/30 text-moss text-[0.8125rem] font-medium hover:bg-moss hover:text-cream transition-colors"
                >
                  Reopen this case
                </button>
              </form>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
