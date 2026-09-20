import { Hono } from 'hono';
import { getAuth, processPolarWebhookEvent } from '../lib/auth';
import { requireAuth } from '../middleware/auth';
import type { AppEnv } from '../types/env';

/**
 * Verifies a Polar Standard Webhooks signature using Web Crypto API.
 */
async function verifyPolarSignature(
  rawBody: string,
  secret: string,
  headers: { id: string | undefined; timestamp: string | undefined; signature: string | undefined },
): Promise<boolean> {
  const { id, timestamp, signature } = headers;
  if (!id || !timestamp || !signature || !secret) return false;

  const tsNum = parseInt(timestamp, 10);
  if (isNaN(tsNum)) return false;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - tsNum) > 300) return false;

  const base64Part = secret.startsWith('whsec_') ? secret.slice(6) : secret;
  let keyBytes: Uint8Array;
  try {
    keyBytes = Uint8Array.from(atob(base64Part), (c) => c.charCodeAt(0));
  } catch {
    return false;
  }

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes as unknown as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );

  const encoder = new TextEncoder();
  const toSign = encoder.encode(`${id}.${timestamp}.${rawBody}`);

  for (const item of signature.split(' ')) {
    const [version, sigBase64] = item.split(',');
    if (version !== 'v1' || !sigBase64) continue;
    try {
      const sigBytes = Uint8Array.from(atob(sigBase64), (c) => c.charCodeAt(0));
      const valid = await crypto.subtle.verify(
        'HMAC',
        cryptoKey,
        sigBytes as unknown as BufferSource,
        toSign as unknown as BufferSource,
      );
      if (valid) return true;
    } catch {
      continue;
    }
  }

  return false;
}

/**
 * Authentication and Session Introspection Router.
 */
export const authRoutes = new Hono<AppEnv>()
  /**
   * Introspect current active session and user profile, including the
   * server-managed billing tier (`plan`) needed for Pro gating UI.
   */
  .get('/session', requireAuth, (c) => {
    const user = c.get('user')!;
    const session = c.get('session')!;

    return c.json({
      success: true as const,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          plan: user.plan === 'pro' ? 'pro' : 'free',
        },
        session: {
          id: session.id,
          expiresAt: session.expiresAt,
        },
      },
    });
  })

  /**
   * Polar Webhook Receiver (Standard Webhooks specification).
   */
  .post('/polar/webhooks', async (c) => {
    const secret = c.env.POLAR_WEBHOOK_SECRET?.trim();
    if (!secret) {
      return c.text('Polar webhook secret not configured', 500);
    }

    const rawBody = await c.req.text();
    const headers = {
      id: c.req.header('webhook-id'),
      timestamp: c.req.header('webhook-timestamp'),
      signature: c.req.header('webhook-signature'),
    };

    const isValid = await verifyPolarSignature(rawBody, secret, headers);
    if (!isValid) {
      return c.text('Webhook verification failed', 400);
    }

    try {
      const event = JSON.parse(rawBody);
      await processPolarWebhookEvent(c.env, event);
    } catch {
      return c.text('Failed to process webhook payload', 400);
    }

    return c.json({ received: true });
  })

  /**
   * Forward all Better Auth standard endpoints (sign-in, sign-up, sign-out, session).
   */
  .all('/*', async (c) => {
    const auth = getAuth(c.env);
    return auth.handler(c.req.raw);
  });
