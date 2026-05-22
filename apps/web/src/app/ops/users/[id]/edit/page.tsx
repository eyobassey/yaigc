import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ChevronLeft, UserCog } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { requireOperator } from '@/lib/auth-helpers';
import { EditUserForm } from './EditUserForm';

export const metadata = { title: 'Edit user' };

export default async function OpsUserEditPage({
  params,
}: {
  params: { id: string };
}) {
  const actor = await requireOperator(`/ops/users/${params.id}/edit`);

  // Only admins can edit. Non-admins hitting the route directly get
  // redirected back to the read-only detail page so the URL doesn't
  // 403 silently.
  if (actor.role !== 'operator_admin') {
    redirect(`/ops/users/${params.id}`);
  }

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      deletedAt: true,
    },
  });
  if (!user) notFound();

  return (
    <div className="max-w-[720px]">
      <Link
        href={`/ops/users/${user.id}`}
        className="inline-flex items-center gap-1 text-stone hover:text-moss text-sm mb-4 transition-colors"
      >
        <ChevronLeft size={14} strokeWidth={1.75} aria-hidden="true" />
        Back to user
      </Link>

      <header className="mb-6 flex items-center gap-3">
        <UserCog
          size={22}
          strokeWidth={1.75}
          className="text-moss"
          aria-hidden="true"
        />
        <h1 className="font-head font-normal text-moss text-[clamp(1.75rem,3vw,2.25rem)] leading-[1.1] break-words">
          Edit {[user.firstName, user.lastName].filter(Boolean).join(' ') || user.email}
        </h1>
      </header>

      {user.deletedAt ? (
        <div className="mb-6 bg-amber-50/60 border-l-4 border-amber-300 px-5 py-4 rounded-r">
          <p className="font-body text-[0.7rem] font-medium uppercase tracking-[0.12em] text-amber-700 mb-1">
            Soft-deleted
          </p>
          <p className="text-charcoal text-[0.9375rem] leading-[1.55]">
            This account is deleted. Editing is disabled until it's restored.
          </p>
        </div>
      ) : null}

      <EditUserForm
        userId={user.id}
        email={user.email}
        initial={{
          firstName: user.firstName ?? '',
          lastName: user.lastName ?? '',
          role: user.role,
        }}
        disabled={Boolean(user.deletedAt)}
        isSelf={actor.id === user.id}
      />
    </div>
  );
}
