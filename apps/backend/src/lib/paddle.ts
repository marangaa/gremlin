/**
 * Paddle Billing Utilities (Edge-compatible Web Crypto API).
 * Adheres to `paddle-webhooks` and `paddle-customer-portal` skill standards.
 */

/**
 * Verifies the Paddle webhook HMAC-SHA256 signature using native Web Crypto.
 * Header format: `ts=1671552777;h1=0a7354d7e2467d9834376c6ee38d77a83d47c4e04018314ffb3b44b3fb9751e1`
 * Signed string: `${ts}:${rawBody}`
 *
 * @param rawBody - Raw unparsed text of the request body.
 * @param signatureHeader - The raw `Paddle-Signature` HTTP header value.
 * @param secret - The notification destination secret key (`pdl_ntfset_...`).
 * @param toleranceSeconds - Maximum allowed age of the webhook timestamp in seconds (default 300s).
 */
export async function verifyPaddleWebhookSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string,
  toleranceSeconds = 300,
): Promise<boolean> {
  if (!rawBody || !signatureHeader || !secret) {
    return false;
  }

  // Parse ts and h1 components
  const parts = signatureHeader.split(';').map((p) => p.trim());
  let tsStr: string | null = null;
  let h1: string | null = null;

  for (const part of parts) {
    const [key, val] = part.split('=');
    if (key === 'ts') tsStr = val ?? null;
    if (key === 'h1') h1 = val ?? null;
  }

  if (!tsStr || !h1) {
    return false;
  }

  const timestamp = parseInt(tsStr, 10);
  if (isNaN(timestamp)) {
    return false;
  }

  // Check timestamp freshness to guard against replay attacks
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > toleranceSeconds) {
    console.warn(`Paddle webhook timestamp out of tolerance (${timestamp}, now: ${now})`);
    return false;
  }

  try {
    const encoder = new TextEncoder();
    const secretKeyData = encoder.encode(secret);
    const signedPayload = encoder.encode(`${tsStr}:${rawBody}`);

    const key = await crypto.subtle.importKey(
      'raw',
      secretKeyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );

    const signatureBuffer = await crypto.subtle.sign('HMAC', key, signedPayload);
    const signatureHex = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    // Constant-time hex string comparison
    if (signatureHex.length !== h1.length) {
      return false;
    }

    let mismatch = 0;
    for (let i = 0; i < signatureHex.length; i++) {
      mismatch |= signatureHex.charCodeAt(i) ^ h1.charCodeAt(i);
    }

    return mismatch === 0;
  } catch (err) {
    console.error('Paddle webhook signature verification error:', err);
    return false;
  }
}

export interface CustomerPortalSessionResult {
  url: string;
  id?: string;
}

/**
 * Mints a Paddle Customer Portal session URL via the Paddle REST API.
 * Adheres to the security model in `paddle-customer-portal`:
 * - Server action only
 * - CustomerId resolved server-side from auth
 * - Returns only the general overview URL
 */
export async function createCustomerPortalSession(
  apiKey: string,
  customerId: string,
  subscriptionIds: string[] = [],
  isSandbox = true,
): Promise<CustomerPortalSessionResult> {
  const baseUrl = isSandbox
    ? 'https://sandbox-api.paddle.com'
    : 'https://api.paddle.com';

  const res = await fetch(`${baseUrl}/customer-portal-sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      customer_id: customerId,
      subscription_ids: subscriptionIds.length > 0 ? subscriptionIds : undefined,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to create Paddle customer portal session: ${res.status} ${errText}`);
  }

  const json: any = await res.json();
  const overviewUrl = json?.data?.urls?.general?.overview;

  if (!overviewUrl) {
    throw new Error('Paddle customer portal response missing urls.general.overview');
  }

  return {
    url: overviewUrl,
    id: json?.data?.id,
  };
}
