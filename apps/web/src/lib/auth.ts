import NextAuth from 'next-auth';
import Nodemailer from 'next-auth/providers/nodemailer';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { createTransport } from 'nodemailer';
import { brand } from '@igc/content';
import { prisma } from '@/lib/prisma';
import {
  magicLinkHtml,
  magicLinkText,
  magicLinkSubject,
} from '@/lib/email/magic-link';

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),

  // Database sessions per README. Required when using an adapter.
  session: { strategy: 'database' },

  providers: [
    Nodemailer({
      server: {
        host: process.env.SMTP_HOST!,
        port: Number(process.env.SMTP_PORT ?? 587),
        auth: {
          user: process.env.SMTP_USER!,
          pass: process.env.SMTP_PASSWORD!,
        },
      },
      from: `${brand.fullName} <${process.env.EMAIL_SENDER}>`,

      // Override the default Auth.js email body with the branded template.
      async sendVerificationRequest({ identifier: to, url, provider }) {
        const { host } = new URL(url);
        const transport = createTransport(provider.server);

        const result = await transport.sendMail({
          to,
          from: provider.from,
          subject: magicLinkSubject(),
          text: magicLinkText({ url, host }),
          html: magicLinkHtml({ url, host }),
        });

        const failed = result.rejected.concat(result.pending).filter(Boolean);
        if (failed.length) {
          throw new Error(
            `magic link email rejected for: ${failed.join(', ')}`,
          );
        }
      },
    }),
  ],

  pages: {
    signIn: '/sign-in',
    verifyRequest: '/sign-in/check-email',
  },

  // Trust X-Forwarded-* headers because the chain is CF -> nginx -> Next.js
  trustHost: true,

  // Share the session across the apex and ops.* (and future app.*) by
  // scoping the cookie to the eTLD+1 with a leading dot. CSRF stays
  // host-only via the __Host- prefix (which forbids setting a domain).
  // In non-production (no NODE_ENV=production), Auth.js's defaults still
  // apply — these overrides only kick in for the production process.
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === 'production'
          ? '__Secure-authjs.session-token'
          : 'authjs.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        ...(process.env.NODE_ENV === 'production'
          ? { domain: '.youareingoodcompany.co.uk' }
          : {}),
      },
    },
    callbackUrl: {
      name:
        process.env.NODE_ENV === 'production'
          ? '__Secure-authjs.callback-url'
          : 'authjs.callback-url',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        ...(process.env.NODE_ENV === 'production'
          ? { domain: '.youareingoodcompany.co.uk' }
          : {}),
      },
    },
    // CSRF cookie keeps the __Host- prefix; that prefix REQUIRES no
    // domain attribute, so leave it host-only.
  },
});
