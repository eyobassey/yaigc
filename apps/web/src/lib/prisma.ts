import { PrismaClient } from '@prisma/client';

// Singleton pattern so Next.js dev hot-reload doesn't open a new connection
// pool on every reload. In production, the module is loaded once anyway.
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
