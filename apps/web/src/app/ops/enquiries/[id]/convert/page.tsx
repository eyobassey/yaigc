import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { ConvertForm } from './ConvertForm';

export const metadata = {
  title: 'Convert enquiry',
};

export default async function ConvertEnquiryPage({
  params,
}: {
  params: { id: string };
}) {
  const enquiry = await prisma.enquiry.findUnique({
    where: { id: params.id },
  });
  if (!enquiry) notFound();

  // Only triaged enquiries can be converted. If the operator lands here
  // by an old link or button, bounce them back to the detail view where
  // the state-machine UI explains what they can do next.
  if (enquiry.status !== 'triaged') {
    redirect(`/ops/enquiries/${enquiry.id}`);
  }

  // Split the single-field enquiry name into best-guess first / last so
  // the operator does not retype. Whitespace split; anything after the
  // first space goes into the last name.
  const trimmed = enquiry.name.trim().split(/\s+/);
  const guessedFirstName = trimmed[0] ?? '';
  const guessedLastName = trimmed.slice(1).join(' ');

  return (
    <div className="max-w-[760px]">
      <Link
        href={`/ops/enquiries/${enquiry.id}`}
        className="inline-flex items-center gap-1 text-stone hover:text-moss text-sm mb-4 transition-colors"
      >
        <ChevronLeft size={14} strokeWidth={1.75} aria-hidden="true" />
        Back to enquiry
      </Link>

      <header className="mb-8">
        <span className="font-body text-[0.75rem] font-medium uppercase tracking-[0.12em] text-stone mb-2 inline-block">
          Convert to Family
        </span>
        <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1]">
          Convert {enquiry.name} into a Family.
        </h1>
        <p className="font-head italic text-terracotta text-[1.125rem] leading-[1.4] mt-3">
          The operator-led intake call has happened. Capture what you know.
        </p>
      </header>

      <ConvertForm
        enquiryId={enquiry.id}
        defaults={{
          billingName: enquiry.name,
          payerFirstName: guessedFirstName,
          payerLastName: guessedLastName,
        }}
      />
    </div>
  );
}
