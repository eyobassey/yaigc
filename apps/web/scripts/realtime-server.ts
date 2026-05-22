// Standalone WebSocket server. Run via PM2; lives next to the Next.js
// app on the same box. Read-only fan-out: clients subscribe with their
// session cookie, server pushes a JSON envelope when a new message
// lands in one of their threads. Writes still go through the existing
// sendMessage server action - this server never accepts message input
// from clients.
//
// Auth: parse the Auth.js session cookie, look up Session.sessionToken
// in Postgres, confirm user exists + not deleted, attach userId.
//
// Fan-out: subscribe to a single Redis pub/sub channel `messaging:user:<id>`
// per connected user (multiplexed via a single Redis subscriber that
// pattern-subscribes to messaging:user:*). When sendMessage publishes,
// every WebSocket open for that userId gets the payload.
//
// Per-process state (a Map<userId, Set<WebSocket>>) is fine because we
// run a single instance. Going multi-instance later: every instance
// subscribes to the same Redis pattern; a publish reaches every node
// and only the right WS is found locally.

import { createServer } from 'node:http';
import { parse as parseUrl } from 'node:url';
import { parse as parseCookie } from 'cookie';
import { WebSocketServer, type WebSocket } from 'ws';
import { createClient as createRedis } from 'redis';
import { PrismaClient } from '@prisma/client';

const PORT = Number(process.env.REALTIME_PORT ?? 3004);
const IS_PROD = process.env.NODE_ENV === 'production';
const SESSION_COOKIE = IS_PROD
  ? '__Secure-authjs.session-token'
  : 'authjs.session-token';
const REDIS_URL = process.env.REDIS_URL;
if (!REDIS_URL) {
  console.error('[realtime] REDIS_URL not set; refusing to start.');
  process.exit(1);
}

const prisma = new PrismaClient();

// One subscriber for pattern messaging:user:*, one publisher kept handy
// for any local-process bookkeeping pings we may want later. node-redis
// requires .subscribe and .publish to use distinct connections.
const subscriber = createRedis({ url: REDIS_URL });
subscriber.on('error', (err) => console.error('[realtime] redis sub error', err));

// Map: userId -> set of open sockets. Cleared on disconnect.
const userSockets = new Map<string, Set<WebSocket>>();

function addUserSocket(userId: string, ws: WebSocket) {
  let set = userSockets.get(userId);
  if (!set) {
    set = new Set();
    userSockets.set(userId, set);
  }
  set.add(ws);
}
function removeUserSocket(userId: string, ws: WebSocket) {
  const set = userSockets.get(userId);
  if (!set) return;
  set.delete(ws);
  if (set.size === 0) userSockets.delete(userId);
}

async function authenticate(rawCookieHeader: string | undefined): Promise<{
  userId: string;
  email: string;
} | null> {
  if (!rawCookieHeader) return null;
  const cookies = parseCookie(rawCookieHeader);
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { sessionToken: token },
    select: {
      userId: true,
      expires: true,
      user: { select: { email: true, deletedAt: true } },
    },
  });
  if (!session) return null;
  if (session.expires.getTime() < Date.now()) return null;
  if (session.user.deletedAt) return null;
  return { userId: session.userId, email: session.user.email };
}

const httpServer = createServer((req, res) => {
  // Simple liveness probe so PM2 / nginx can health-check without a
  // WebSocket upgrade.
  if (req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok\n');
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ noServer: true });

httpServer.on('upgrade', async (req, socket, head) => {
  const { pathname } = parseUrl(req.url ?? '/');
  if (pathname !== '/messaging') {
    socket.destroy();
    return;
  }
  const auth = await authenticate(req.headers.cookie).catch((err) => {
    console.error('[realtime] auth lookup failed', err);
    return null;
  });
  if (!auth) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, auth);
  });
});

wss.on('connection', (ws, auth: { userId: string; email: string }) => {
  addUserSocket(auth.userId, ws);
  ws.send(JSON.stringify({ kind: 'hello', userId: auth.userId }));

  // Keep-alive: nginx + Cloudflare close idle connections; ping every
  // 25s. The browser auto-handles the pong frame.
  const pinger = setInterval(() => {
    if (ws.readyState === ws.OPEN) {
      try {
        ws.ping();
      } catch {
        /* swallow */
      }
    }
  }, 25_000);

  ws.on('close', () => {
    clearInterval(pinger);
    removeUserSocket(auth.userId, ws);
  });
  ws.on('error', (err) => {
    console.error('[realtime] socket error', { userId: auth.userId, err });
  });

  // Ignore inbound messages. Writes go via the Next.js server action.
  ws.on('message', () => {
    /* no-op: read-only channel */
  });
});

// Wire Redis subscriber. Channel pattern is `messaging:user:<userId>`
// and the payload is JSON: { kind: 'message', threadId, message }.
async function startSubscriber() {
  await subscriber.connect();
  await subscriber.pSubscribe('messaging:user:*', (raw, channel) => {
    const userId = channel.slice('messaging:user:'.length);
    const set = userSockets.get(userId);
    if (!set || set.size === 0) return;
    for (const ws of set) {
      if (ws.readyState === ws.OPEN) {
        try {
          ws.send(raw);
        } catch (err) {
          console.error('[realtime] forward failed', { userId, err });
        }
      }
    }
  });
  console.log('[realtime] subscribed to messaging:user:*');
}

httpServer.listen(PORT, () => {
  console.log(`[realtime] listening on :${PORT}`);
});

startSubscriber().catch((err) => {
  console.error('[realtime] subscriber failed to start', err);
  process.exit(1);
});

// Graceful shutdown so PM2 reloads don't drop connections rudely.
function shutdown() {
  console.log('[realtime] shutting down');
  for (const set of userSockets.values()) {
    for (const ws of set) {
      try {
        ws.close(1001, 'server shutting down');
      } catch {
        /* swallow */
      }
    }
  }
  httpServer.close(() => process.exit(0));
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
