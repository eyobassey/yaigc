'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { CheckCircle2 } from 'lucide-react';
import { verifyRightToWork, type VerifyRightToWorkState } from '@/lib/companion';

const TYPE_LABEL: Record<string, string> = {
  british_irish_passport: 'British or Irish passport',
  settled_status: 'Settled status',
  pre_settled_status: 'Pre-settled status',
  skilled_worker_visa: 'Skilled Worker visa',
  graduate_visa: 'Graduate visa',
  student_visa: 'Student visa',
  dependant_visa: 'Dependant visa',
  indefinite_leave_to_remain: 'Indefinite Leave to Remain',
  other: 'Other',
};

const initial: VerifyRightToWorkState = { ok: false };

export function RightToWorkPanel({
  applicationId,
  attestation,
  type,
  shareCode,
  expiresAt,
  dateOfBirth,
  verifiedAt,
  verifiedBy,
  verificationNote,
}: {
  applicationId: string;
  attestation: boolean;
  type: string | null;
  shareCode: string | null;
  expiresAt: Date | null;
  dateOfBirth: Date | null;
  verifiedAt: Date | null;
  verifiedBy: { firstName: string | null; lastName: string | null; email: string } | null;
  verificationNote: string | null;
}) {
  const [state, action] = useFormState(verifyRightToWork, initial);
  const verifierName = verifiedBy
    ? `${verifiedBy.firstName ?? ''} ${verifiedBy.lastName ?? ''}`.trim() || verifiedBy.email
    : null;

  return (
    <div className="flex flex-col gap-3">
      <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1.5 text-[0.875rem]">
        <dt className="text-stone">Self-attestation</dt>
        <dd className="text-charcoal">{attestation ? 'Confirmed' : 'Not confirmed'}</dd>
        <dt className="text-stone">Type</dt>
        <dd className="text-charcoal">{type ? TYPE_LABEL[type] ?? type : 'Not stated'}</dd>
        {shareCode ? (
          <>
            <dt className="text-stone">Share code</dt>
            <dd className="text-charcoal font-mono">{shareCode}</dd>
          </>
        ) : null}
        {dateOfBirth ? (
          <>
            <dt className="text-stone">Date of birth</dt>
            <dd className="text-charcoal font-mono">
              {dateOfBirth.toISOString().slice(0, 10)}
            </dd>
          </>
        ) : null}
        {expiresAt ? (
          <>
            <dt className="text-stone">Visa expires</dt>
            <dd className="text-charcoal font-mono">{expiresAt.toISOString().slice(0, 10)}</dd>
          </>
        ) : null}
      </dl>

      {verifiedAt ? (
        <div className="border-t border-moss/10 pt-3">
          <p className="font-body text-[0.7rem] font-medium uppercase tracking-[0.08em] text-moss mb-1 inline-flex items-center gap-1.5">
            <CheckCircle2 size={14} strokeWidth={1.75} aria-hidden="true" />
            Verified {verifiedAt.toISOString().slice(0, 10)}
          </p>
          {verifierName ? (
            <p className="text-stone text-[0.8125rem]">by {verifierName}</p>
          ) : null}
          {verificationNote ? (
            <p className="text-charcoal text-[0.875rem] mt-2 whitespace-pre-wrap break-words">
              {verificationNote}
            </p>
          ) : null}
        </div>
      ) : (
        <form action={action} className="border-t border-moss/10 pt-3 flex flex-col gap-2">
          <input type="hidden" name="applicationId" value={applicationId} />
          <p className="font-body text-[0.7rem] font-medium uppercase tracking-[0.08em] text-terracotta">
            Not yet verified
          </p>
          <p className="text-charcoal text-[0.875rem]">
            Run the gov.uk online check at{' '}
            <a
              href="https://www.gov.uk/view-right-to-work"
              target="_blank"
              rel="noopener noreferrer"
              className="link"
            >
              gov.uk/view-right-to-work
            </a>{' '}
            using the share code and date of birth above. Paste the result reference (or your own note) below.
          </p>
          <textarea
            name="note"
            rows={3}
            required
            maxLength={2000}
            placeholder="gov.uk check reference + outcome, e.g. 'Verified 22 May 2026, valid until 31 Dec 2028, ref XYZ123'"
            className="bg-cream border border-moss/15 rounded-md px-3 py-2 text-charcoal text-[0.875rem] placeholder:text-stone/60 focus:border-moss focus:outline-none focus:ring-2 focus:ring-moss/20 resize-y"
          />
          {state.errors?.note ? (
            <p className="text-terracotta text-[0.8125rem]">{state.errors.note}</p>
          ) : null}
          {state.errors?._form ? (
            <p className="text-terracotta text-[0.8125rem]">{state.errors._form}</p>
          ) : null}
          <SubmitButton />
        </form>
      )}
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="self-start inline-flex items-center justify-center px-4 py-2 rounded-md bg-moss text-cream text-[0.8125rem] font-medium hover:bg-moss-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? 'Marking verified…' : 'Mark verified'}
    </button>
  );
}
