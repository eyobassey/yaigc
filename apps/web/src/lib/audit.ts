import { headers } from 'next/headers';
import type { ActorType, ActionType, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export interface AuditInput {
  actorType: ActorType;
  actorId?: string | null;
  actorRole?: string | null;
  actionType: ActionType;
  targetType: string;
  targetId?: string | null;
  beforeState?: unknown;
  afterState?: unknown;
  metadata?: Record<string, unknown> | null;
  /** Override the auto-captured request IP. */
  ip?: string | null;
  /** Override the auto-captured user-agent. */
  userAgent?: string | null;
  /** Override the auto-captured X-Request-Id. */
  requestId?: string | null;
}

/**
 * Record a single audit log entry.
 *
 * **Best-effort by design.** If the write fails (DB outage, append-only
 * trigger gone weird, transient connection loss), the failure is logged
 * to stderr and swallowed — audit writes must never break the business
 * operation they are observing. Per SDD §12.7 the log is append-only and
 * the DB layer enforces that via a trigger.
 *
 * IP / user-agent / request id are captured from the active request via
 * `headers()` when not passed in. If called from a context where
 * `headers()` is unavailable (background jobs, scripts), pass them
 * explicitly or accept null.
 */
export async function audit(input: AuditInput): Promise<void> {
  let ip = input.ip ?? null;
  let userAgent = input.userAgent ?? null;
  let requestId = input.requestId ?? null;

  if (ip === null || userAgent === null || requestId === null) {
    try {
      const h = headers();
      if (ip === null) {
        const xff = h.get('x-forwarded-for');
        const first = xff?.split(',')[0]?.trim();
        ip = first || null;
      }
      if (userAgent === null) userAgent = h.get('user-agent');
      if (requestId === null) requestId = h.get('x-request-id');
    } catch {
      // headers() is not available in this context (background job,
      // server start-up, etc). Silently fall through with nulls.
    }
  }

  try {
    await prisma.auditLogEntry.create({
      data: {
        actorType: input.actorType,
        actorId: input.actorId ?? null,
        actorRole: input.actorRole ?? null,
        actionType: input.actionType,
        targetType: input.targetType,
        targetId: input.targetId ?? null,
        beforeState: input.beforeState as Prisma.InputJsonValue | undefined,
        afterState: input.afterState as Prisma.InputJsonValue | undefined,
        ip,
        userAgent,
        requestId,
        metadata: input.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (err) {
    // Audit failures must not propagate. Log and move on.
    console.error('[audit] write failed', {
      err: err instanceof Error ? err.message : String(err),
      input,
    });
  }
}
