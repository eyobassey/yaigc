import { Monitor, X } from 'lucide-react';
import { revokeSession } from '@/lib/session-actions';

interface Device {
  id: string;
  label: string;
  createdAt: string;
  lastActiveAt: string;
  expires: string;
  isCurrent: boolean;
}

interface Props {
  devices: Device[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(iso);
}

export function DeviceListSection({ devices }: Props) {
  if (devices.length === 0) return null;

  return (
    <section className="bg-paper border border-moss/[0.08] rounded-[12px] p-5 sm:p-6 mb-6">
      <h2 className="font-body text-[0.7rem] font-medium uppercase tracking-[0.1em] text-stone mb-3 flex items-center gap-2">
        <Monitor size={12} strokeWidth={1.75} aria-hidden="true" />
        Devices signed in
      </h2>
      <p className="text-charcoal text-[0.9375rem] leading-[1.55] mb-4">
        Each row is an active session. Revoke anything that does not look
        familiar - that device will be signed out immediately.
      </p>
      <ul className="flex flex-col gap-2">
        {devices.map((d) => (
          <li
            key={d.id}
            className="flex items-start gap-3 bg-cream rounded-md px-3 py-2.5 border border-moss/10"
          >
            <Monitor
              size={18}
              strokeWidth={1.5}
              className="text-moss flex-shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div className="flex-1 min-w-0">
              <div className="text-charcoal text-[0.9375rem] font-medium flex items-center gap-2 flex-wrap">
                {d.label}
                {d.isCurrent ? (
                  <span className="font-body text-[0.65rem] font-medium uppercase tracking-[0.08em] px-2 py-0.5 rounded bg-moss/15 text-moss whitespace-nowrap">
                    This device
                  </span>
                ) : null}
              </div>
              <div className="text-stone text-[0.75rem] mt-0.5">
                Active {formatRelative(d.lastActiveAt)} · signed in{' '}
                {formatDate(d.createdAt)} · expires {formatDate(d.expires)}
              </div>
            </div>
            <form action={revokeSession} className="flex-shrink-0">
              <input type="hidden" name="id" value={d.id} />
              <button
                type="submit"
                aria-label={d.isCurrent ? 'Sign out this device' : 'Revoke this device'}
                className="text-stone hover:text-terracotta transition-colors p-1"
                title={d.isCurrent ? 'Sign out of this device' : 'Sign out of this device'}
              >
                <X size={16} strokeWidth={1.75} aria-hidden="true" />
              </button>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}
