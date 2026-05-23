// Thin Redis publisher used by the messaging server actions to fan out
// to the WebSocket server. We keep the client connection lazy because
// Next.js compiles this module into edge + node paths and we want zero
// cost on requests that don't publish.

import { createClient, type RedisClientType } from 'redis';

let cached: Promise<RedisClientType> | null = null;

async function getPublisher(): Promise<RedisClientType> {
  if (cached) return cached;
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error('REDIS_URL is not set');
  }
  cached = (async () => {
    const client = createClient({ url });
    client.on('error', (err) =>
      console.error('[realtime] publisher error', err),
    );
    await client.connect();
    return client as RedisClientType;
  })();
  return cached;
}

// M.1.2: attachments ride alongside each message in the envelope so
// the client can render them inline as soon as they land, without a
// second round trip to fetch metadata.
export interface MessageEnvelopeAttachment {
  id: string;
  contentType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  originalFilename: string | null;
}

// A new message has landed in a thread the recipient subscribes to.
export interface NewMessageEnvelope {
  kind: 'message';
  threadId: string;
  message: {
    id: string;
    body: string;
    senderId: string;
    createdAt: string;
    attachments?: MessageEnvelopeAttachment[];
  };
}

// M.3.2: a previously-sent message has been deleted by its sender.
// Clients flip the bubble to a tombstone in place; the row + body
// stay on disk and are recoverable via the audit log.
export interface MessageDeletedEnvelope {
  kind: 'message-deleted';
  threadId: string;
  messageId: string;
}

export type MessageEnvelope = NewMessageEnvelope | MessageDeletedEnvelope;

// Fire-and-forget per-user publish. Errors are logged and swallowed
// because we never want a Redis hiccup to roll back a message write -
// the email fallback + on-refresh hydration cover the gap.
export async function publishMessageToUsers(
  userIds: string[],
  envelope: MessageEnvelope,
): Promise<void> {
  try {
    const client = await getPublisher();
    const payload = JSON.stringify(envelope);
    await Promise.all(
      userIds.map((id) =>
        client.publish(`messaging:user:${id}`, payload),
      ),
    );
  } catch (err) {
    console.error('[realtime] publish failed', { userIds, err });
  }
}
