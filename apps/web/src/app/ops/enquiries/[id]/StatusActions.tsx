import { revalidatePath } from 'next/cache';
import type { EnquiryStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { audit } from '@/lib/audit';

// Status transition panel for an Enquiry. One <form> wraps an optional
// note textarea and one button per allowed target status. Each button
// submits with a hidden `to=<status>` value so a single server action
// handles every transition. The note is captured into the audit entry
// metadata; it is not stored on the Enquiry row, so the append-only
// audit log remains the single source of truth for the trail.

const STATUS_LABEL: Record<EnquiryStatus, string> = {
  new: 'Move back to New',
  triaged: 'Mark triaged',
  converted: 'Mark converted',
  closed: 'Mark closed',
};

const STATUS_DESCRIPTION: Record<EnquiryStatus, string> = {
  new: 'Brand-new enquiry, not yet handled.',
  triaged: 'A real person has read this and is acting on it.',
  converted: 'This enquiry became a paying customer (Family).',
  closed: 'No further action. Not a fit, or no response.',
};

const ALLOWED_NEXT: Record<EnquiryStatus, EnquiryStatus[]> = {
  new: ['triaged', 'closed'],
  triaged: ['converted', 'closed', 'new'],
  converted: ['closed'],
  closed: ['new'],
};

const NOTE_MAX_LENGTH = 2000;

export function StatusActions({
  enquiryId,
  currentStatus,
  actorId,
  actorRole,
}: {
  enquiryId: string;
  currentStatus: EnquiryStatus;
  actorId: string;
  actorRole: string;
}) {
  const candidates = ALLOWED_NEXT[currentStatus];

  return (
    <form
      action={async (formData) => {
        'use server';
        await transitionStatus({
          enquiryId,
          from: currentStatus,
          to: formData.get('to') as EnquiryStatus,
          note: (formData.get('note') as string)?.trim() || null,
          actorId,
          actorRole,
        });
      }}
      className="flex flex-col gap-3 bg-paper border border-moss/[0.08] rounded-[10px] p-4 min-w-[260px]"
    >
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-body text-[0.7rem] font-medium uppercase tracking-[0.08em] text-stone">
          Note (optional)
        </span>
        <textarea
          name="note"
          rows={2}
          maxLength={NOTE_MAX_LENGTH}
          placeholder="Why are we changing status?"
          className="bg-cream border border-moss/15 rounded-md px-3 py-2 text-charcoal text-[0.875rem] placeholder:text-stone/60 focus:border-moss focus:outline-none focus:ring-2 focus:ring-moss/20 resize-y"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        {candidates.map((next) => (
          <button
            key={next}
            type="submit"
            name="to"
            value={next}
            className="inline-flex items-center px-3 py-1.5 rounded-md border border-moss/20 text-moss text-[0.8125rem] font-medium hover:bg-moss hover:text-cream transition-colors"
            title={STATUS_DESCRIPTION[next]}
          >
            {STATUS_LABEL[next]}
          </button>
        ))}
      </div>
    </form>
  );
}

async function transitionStatus({
  enquiryId,
  from,
  to,
  note,
  actorId,
  actorRole,
}: {
  enquiryId: string;
  from: EnquiryStatus;
  to: EnquiryStatus;
  note: string | null;
  actorId: string;
  actorRole: string;
}) {
  // Optimistic guard: if a concurrent edit moved the enquiry already, the
  // updateMany fence catches it and we no-op without an audit row.
  const result = await prisma.enquiry.updateMany({
    where: { id: enquiryId, status: from },
    data: { status: to },
  });

  if (result.count === 1) {
    await audit({
      actorType: 'user',
      actorId: actorId || null,
      actorRole: actorRole || null,
      actionType: 'state_change',
      targetType: 'Enquiry',
      targetId: enquiryId,
      beforeState: { status: from },
      afterState: { status: to },
      metadata: { event: 'status_change', ...(note ? { note } : {}) },
    });
  }

  revalidatePath(`/ops/enquiries/${enquiryId}`);
  revalidatePath('/ops/enquiries');
  revalidatePath('/ops');
}
