import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { ApproveForm } from './ApproveForm';

export const metadata = { title: 'Approve application' };

export default async function ApproveApplicationPage({
  params,
}: {
  params: { id: string };
}) {
  const application = await prisma.companionApplication.findUnique({
    where: { id: params.id },
  });
  if (!application) notFound();
  if (application.status !== 'vetting') {
    redirect(`/ops/companions/${application.id}`);
  }

  return (
    <div className="max-w-[680px]">
      <Link
        href={`/ops/companions/${application.id}`}
        className="inline-flex items-center gap-1 text-stone hover:text-moss text-sm mb-4 transition-colors"
      >
        <ChevronLeft size={14} strokeWidth={1.75} aria-hidden="true" />
        Back to application
      </Link>
      <header className="mb-8">
        <span className="font-body text-[0.75rem] font-medium uppercase tracking-[0.12em] text-stone mb-2 inline-block">
          Approve and create Companion
        </span>
        <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1] break-words">
          {application.firstName} {application.lastName}
        </h1>
        <p className="font-head italic text-terracotta text-[1.125rem] leading-[1.4] mt-3">
          DBS clean, references in, training complete.
        </p>
      </header>

      <ApproveForm applicationId={application.id} />
    </div>
  );
}
