import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Edge middleware: keep the operator console hosts canonical.
//
// On ops.youareingoodcompany.co.uk, any non-operator path is redirected
// into /ops/. This means visiting the bare subdomain (or a stale URL)
// drops you into the operator console rather than the marketing home.
//
// We deliberately leave the auth flow (/sign-in, /sign-in/check-email,
// /no-access) and the Next/internal/api paths reachable on both hosts:
//   - /sign-in: an operator may need to sign in on ops.* directly
//   - /api/auth/*: Auth.js callbacks must hit the same host the cookie
//     was set on
//   - /_next/*: static assets and runtime chunks
//   - /favicon.ico, /icon.svg, /opengraph-image*, /robots.txt, /sitemap.xml,
//     /apple-touch-icon*: browser-issued asset requests
//
// We do not block /ops/* on the apex host. The role gate in the /ops/
// layout enforces who can see it; the subdomain redirect is UX, not
// security.

const OPS_HOST_PREFIX = 'ops.';

const PASSTHROUGH_PREFIXES = [
  '/ops',
  '/api',
  '/_next',
  '/sign-in',
  '/no-access',
] as const;

const PASSTHROUGH_EXACT = new Set([
  '/favicon.ico',
  '/icon.svg',
  '/robots.txt',
  '/sitemap.xml',
  '/opengraph-image',
  '/apple-touch-icon.png',
]);

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? '';
  const { pathname } = request.nextUrl;

  if (host.startsWith(OPS_HOST_PREFIX)) {
    const isPassthroughPrefix = PASSTHROUGH_PREFIXES.some((p) => pathname.startsWith(p));
    const isPassthroughExact = PASSTHROUGH_EXACT.has(pathname);
    if (!isPassthroughPrefix && !isPassthroughExact) {
      // Build an absolute URL from the request's *forwarded* host rather
      // than request.nextUrl (which resolves to the 127.0.0.1:3002 listen
      // address behind nginx and would leak localhost into the browser).
      // x-forwarded-proto / x-forwarded-host are set by the nginx proxy.
      const forwardedHost = request.headers.get('x-forwarded-host') ?? host;
      const proto = request.headers.get('x-forwarded-proto') ?? 'https';
      const target = new URL(`${proto}://${forwardedHost}/ops`);
      return NextResponse.redirect(target, 308);
    }
  }

  return NextResponse.next();
}

export const config = {
  // Don't run middleware on Next internals; match everything else.
  matcher: ['/((?!_next/static|_next/image).*)'],
};
