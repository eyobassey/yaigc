// Shared session lifetime + cookie + device-fingerprint helpers.
// Three sign-in paths (magic-link, password, passkey) all converge
// here so the device list on /account stays consistent.

import { randomBytes } from 'node:crypto';
import { cookies, headers } from 'next/headers';
import { prisma } from '@/lib/prisma';

// Cookie names match Auth.js + lib/auth.ts so a session minted here
// is interchangeable with one minted by the magic-link adapter.
export const SESSION_COOKIE_NAME =
  process.env.NODE_ENV === 'production'
    ? '__Secure-authjs.session-token'
    : 'authjs.session-token';

// Long = "remember this device" (60 days). Short = transient device
// (12 hours). Magic-link sign-ins always use long because the user
// already proved access to their email.
export const LONG_SESSION_DAYS = 60;
export const SHORT_SESSION_HOURS = 12;

export function longExpiry(): Date {
  return new Date(Date.now() + LONG_SESSION_DAYS * 24 * 60 * 60 * 1000);
}
export function shortExpiry(): Date {
  return new Date(Date.now() + SHORT_SESSION_HOURS * 60 * 60 * 1000);
}

export interface MintOptions {
  userId: string;
  remember: boolean;
}

// Reads the User-Agent header. Available in any Server Component or
// server action because Next.js's headers() is request-scoped.
function userAgentFromRequest(): string | null {
  try {
    const ua = headers().get('user-agent');
    return ua ? ua.slice(0, 400) : null;
  } catch {
    return null;
  }
}

export async function mintAndSetSession({
  userId,
  remember,
}: MintOptions): Promise<void> {
  const sessionToken = randomBytes(32).toString('hex');
  const expires = remember ? longExpiry() : shortExpiry();
  const userAgent = userAgentFromRequest();
  await prisma.session.create({
    data: {
      sessionToken,
      userId,
      expires,
      userAgent,
      lastActiveAt: new Date(),
    },
  });
  cookies().set({
    name: SESSION_COOKIE_NAME,
    value: sessionToken,
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    expires,
    ...(process.env.NODE_ENV === 'production'
      ? { domain: '.youareingoodcompany.co.uk' }
      : {}),
  });
}

// ----- Device label helpers (used by the account page) ----------------

export interface DeviceInfo {
  family: string;       // "Safari", "Chrome", "Firefox", "Other"
  platform: string;     // "iPhone", "iPad", "macOS", "Windows", "Android", "Linux", "Other"
}

// Tiny inline UA parser. Browser detection is fundamentally lossy; we
// only need a friendly label, not perfect accuracy. Order matters:
// some browsers identify themselves as Safari too.
export function parseUserAgent(ua: string | null): DeviceInfo {
  if (!ua) return { family: 'Unknown', platform: 'Unknown' };

  let family = 'Other';
  if (/Edg\//.test(ua)) family = 'Edge';
  else if (/OPR\/|Opera/.test(ua)) family = 'Opera';
  else if (/Firefox\//.test(ua)) family = 'Firefox';
  else if (/Chrome\//.test(ua)) family = 'Chrome';
  else if (/Safari\//.test(ua)) family = 'Safari';

  let platform = 'Other';
  if (/iPhone/.test(ua)) platform = 'iPhone';
  else if (/iPad/.test(ua)) platform = 'iPad';
  else if (/Mac OS X|Macintosh/.test(ua)) platform = 'macOS';
  else if (/Windows/.test(ua)) platform = 'Windows';
  else if (/Android/.test(ua)) platform = 'Android';
  else if (/Linux/.test(ua)) platform = 'Linux';

  return { family, platform };
}

export function deviceLabel(ua: string | null): string {
  const d = parseUserAgent(ua);
  if (d.family === 'Other' && d.platform === 'Other') return 'Unknown device';
  if (d.family === 'Other') return d.platform;
  if (d.platform === 'Other') return d.family;
  return `${d.family} on ${d.platform}`;
}

// ----- Device list helpers (used by the account page) ----------------

export interface ListedSession {
  id: string;
  label: string;
  createdAt: Date;
  lastActiveAt: Date;
  expires: Date;
  isCurrent: boolean;
}

export async function listUserSessions(userId: string): Promise<ListedSession[]> {
  const currentToken = cookies().get(SESSION_COOKIE_NAME)?.value ?? null;
  const rows = await prisma.session.findMany({
    where: { userId, expires: { gt: new Date() } },
    orderBy: { lastActiveAt: 'desc' },
    select: {
      id: true,
      sessionToken: true,
      userAgent: true,
      createdAt: true,
      lastActiveAt: true,
      expires: true,
    },
  });
  return rows.map((s) => ({
    id: s.id,
    label: deviceLabel(s.userAgent),
    createdAt: s.createdAt,
    lastActiveAt: s.lastActiveAt,
    expires: s.expires,
    isCurrent: s.sessionToken === currentToken,
  }));
}
