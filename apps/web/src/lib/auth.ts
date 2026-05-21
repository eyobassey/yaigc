import NextAuth from 'next-auth';
import Nodemailer from 'next-auth/providers/nodemailer';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),

  // Database sessions, not JWT. Required by Auth.js when using an adapter.
  // Per README: "Auth.js v5 with database sessions" is the chosen strategy.
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
      from: process.env.EMAIL_SENDER!,
    }),
  ],

  pages: {
    signIn: '/sign-in',
    verifyRequest: '/sign-in/check-email',
  },

  // Trust the X-Forwarded-* headers from nginx (CF -> nginx -> Next.js)
  trustHost: true,
});
