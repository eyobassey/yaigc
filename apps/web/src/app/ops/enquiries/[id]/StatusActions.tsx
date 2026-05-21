import { revalidatePath } from 'next/cache';
import type { EnquiryStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { audit } from '@/lib/audit';

// Server-component status-action panel for an Enquiry. Renders one form
// per allowed target status. Each form is a server action that runs the
// transition, writes the audit entry, and revalidates the detail page.

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
    <div className="flex flex-wrap gap-2">
      {candidates.map((next) => (
        <form
          key={next}
          action={async () => {
            'use server';
            await transitionStatus({
              enquiryId,
              from: currentStatus,
              to: next,
              actorId,
              actorRole,
            });
          }}
        >
          <button
            type="submit"
            className="inline-flex items-center px-3 py-1.5 rounded-md border border-moss/20 text-moss text-[0.8125rem] font-medium hover:bg-moss hover:text-cream transition-colors"
            title={STATUS_DESCRIPTION[next]}
          >
            {STATUS_LABEL[next]}
          </button>
        </form>
      ))}
    </div>
  );
}

async function transitionStatus({
  enquiryId,
  from,
  to,
  actorId,
  actorRole,
}: {
  enquiryId: string;
  from: EnquiryStatus;
  to: EnquiryStatus;
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
      metadata: { event: 'status_change' },
    });
  }

  revalidatePath(`/ops/enquiries/${enquiryId}`);
  revalidatePath('/ops/enquiries');
  revalidatePath('/ops');
}
