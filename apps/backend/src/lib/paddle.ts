import {
  Environment,
  LogLevel,
  Paddle,
  type PaddleOptions,
  type EventEntity,
  EventName,
} from '@paddle/paddle-node-sdk';

export { EventName, type EventEntity };

/**
 * Creates or retrieves a Paddle Node SDK instance configured for the environment.
 * Adheres strictly to `paddle-webhooks` and `paddle-customer-portal` agent skills.
 */
export function getPaddleInstance(apiKey: string, env: 'sandbox' | 'production' = 'sandbox'): Paddle {
  const options: PaddleOptions = {
    environment: env === 'production' ? Environment.production : Environment.sandbox,
    logLevel: LogLevel.error,
  };
  return new Paddle(apiKey, options);
}

/**
 * Verifies and unmarshals an incoming Paddle webhook using the official Paddle Node SDK.
 * Throws if the signature fails, the timestamp is expired, or the payload is malformed.
 */
export async function unmarshalPaddleWebhook(
  rawBody: string,
  secret: string,
  signature: string,
  apiKey: string,
  env: 'sandbox' | 'production' = 'sandbox',
): Promise<EventEntity | null> {
  const paddle = getPaddleInstance(apiKey, env);
  return await paddle.webhooks.unmarshal(rawBody, secret, signature);
}

/**
 * Mints a Paddle Customer Portal session URL using the official Paddle Node SDK.
 * Adheres to the security model in `paddle-customer-portal`:
 * - Server action only
 * - CustomerId resolved server-side from auth
 * - Returns only the general overview URL
 */
export async function createCustomerPortalSession(
  apiKey: string,
  customerId: string,
  subscriptionIds: string[] = [],
  env: 'sandbox' | 'production' = 'sandbox',
): Promise<{ url: string }> {
  const paddle = getPaddleInstance(apiKey, env);
  const session = await paddle.customerPortalSessions.create(
    customerId,
    subscriptionIds,
  );

  const overviewUrl = session?.urls?.general?.overview;
  if (!overviewUrl) {
    throw new Error('Paddle customer portal response missing urls.general.overview');
  }

  return { url: overviewUrl };
}
