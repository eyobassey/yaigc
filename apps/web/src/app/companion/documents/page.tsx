import { FileText, ShieldCheck } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { requireCompanion } from '@/lib/auth-helpers';
import { DocumentList } from '@/app/ops/companions/[id]/DocumentList';

export const metadata = { title: 'Documents' };

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

export default async function CompanionDocumentsPage() {
  const { companion } = await requireCompanion('/companion/documents');

  const application = await prisma.companionApplication.findUnique({
    where: { id: companion.applicationId },
    include: {
      documents: {
        where: { archivedAt: null },
        orderBy: { uploadedAt: 'desc' },
      },
    },
  });

  if (!application) {
    return (
      <p className="text-stone text-[0.9375rem]">
        We could not load your application. Please get in touch.
      </p>
    );
  }

  return (
    <div className="max-w-[720px]">
      <header className="mb-6 flex items-center gap-3">
        <FileText size={22} strokeWidth={1.75} className="text-moss" aria-hidden="true" />
        <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1]">
          Documents
        </h1>
      </header>
      <p className="text-charcoal text-[0.9375rem] leading-[1.55] mb-6 max-w-[60ch]">
        Right-to-work proof, DBS, anything else we need on file. Upload
        from your phone or computer; we accept JPEG, PNG, or PDF up to
        10MB. If you replace a document later, we keep the original on
        file too - we never delete what is uploaded.
      </p>

      <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6 mb-6">
        <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-3 inline-flex items-center gap-2">
          <ShieldCheck size={14} strokeWidth={1.75} className="text-moss" aria-hidden="true" />
          Right-to-work status
        </h2>
        <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1.5 text-[0.875rem]">
          <dt className="text-stone">Type on file</dt>
          <dd className="text-charcoal">
            {application.rightToWorkType
              ? TYPE_LABEL[application.rightToWorkType] ?? application.rightToWorkType
              : 'Not stated'}
          </dd>
          {application.rightToWorkShareCode ? (
            <>
              <dt className="text-stone">Share code</dt>
              <dd className="text-charcoal font-mono">{application.rightToWorkShareCode}</dd>
            </>
          ) : null}
          {application.rightToWorkExpiresAt ? (
            <>
              <dt className="text-stone">Visa expires</dt>
              <dd className="text-charcoal font-mono">
                {application.rightToWorkExpiresAt.toISOString().slice(0, 10)}
              </dd>
            </>
          ) : null}
          <dt className="text-stone">Verification</dt>
          <dd className="text-charcoal">
            {application.rightToWorkVerifiedAt ? (
              <span className="text-moss">
                Verified {application.rightToWorkVerifiedAt.toISOString().slice(0, 10)}
              </span>
            ) : (
              <span className="text-terracotta">Awaiting verification</span>
            )}
          </dd>
        </dl>
        <p className="text-stone text-[0.8125rem] mt-3 leading-[1.55]">
          To change the type or share code, get in touch. Operators handle
          changes there so the gov.uk check stays in sync.
        </p>
      </section>

      <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6">
        <h2 className="font-body text-[0.75rem] font-medium uppercase tracking-[0.1em] text-stone mb-3 inline-flex items-center gap-2">
          <FileText size={14} strokeWidth={1.75} className="text-moss" aria-hidden="true" />
          Uploaded documents ({application.documents.length})
        </h2>
        <DocumentList
          applicationId={application.id}
          documents={application.documents.map((d) => ({
            id: d.id,
            kind: d.kind,
            filename: d.filename,
            contentType: d.contentType,
            sizeBytes: d.sizeBytes,
            description: d.description,
            uploadedAt: d.uploadedAt.toISOString(),
          }))}
        />
      </section>
    </div>
  );
}
