import { initializePaddle, type Paddle, type Environments } from '@paddle/paddle-js';

export const PADDLE_PRO_PRICE_ID =
  (import.meta.env.VITE_PADDLE_PRO_PRICE_ID as string | undefined) || '';

export const PADDLE_FOUNDER_PRICE_ID =
  (import.meta.env.VITE_PADDLE_FOUNDER_PRICE_ID as string | undefined) || '';

const PADDLE_CLIENT_TOKEN =
  (import.meta.env.VITE_PADDLE_CLIENT_TOKEN as string | undefined) || '';

const PADDLE_ENV =
  ((import.meta.env.VITE_PADDLE_ENV as string | undefined) || 'sandbox') as Environments;

let paddleInstancePromise: Promise<Paddle | null> | null = null;

/**
 * Initializes and retrieves the singleton Paddle.js instance.
 * Adheres to `paddle-checkout-web` skill: guards against double initialization.
 */
export async function getPaddle(): Promise<Paddle | null> {
  if (typeof window === 'undefined') return null;

  if (!PADDLE_CLIENT_TOKEN) {
    console.warn('VITE_PADDLE_CLIENT_TOKEN is not configured in apps/web .env');
    return null;
  }

  if (!paddleInstancePromise) {
    paddleInstancePromise = initializePaddle({
      token: PADDLE_CLIENT_TOKEN,
      environment: PADDLE_ENV,
      eventCallback: (event) => {
        if (event.name === 'checkout.completed') {
          console.log('Paddle checkout completed successfully:', event.data);
          // Refresh window/state after brief delay to pick up webhook-updated session
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        }
      },
      checkout: {
        settings: {
          variant: 'one-page',
          theme: 'dark',
        },
      },
    }).then((p) => p || null);
  }

  return paddleInstancePromise;
}

export interface OpenCheckoutOptions {
  priceId: string;
  userEmail?: string;
  userId?: string;
  customData?: Record<string, any>;
}

/**
 * Opens the hosted Paddle overlay modal checkout.
 * Passes pre-filled customer email and userId bridge for server-side webhook reconciliation.
 */
export async function openPaddleCheckout({
  priceId,
  userEmail,
  userId,
  customData = {},
}: OpenCheckoutOptions) {
  const paddle = await getPaddle();

  if (!paddle) {
    // If client token is unconfigured (development placeholder), alert gracefully
    alert('Paddle checkout is not yet configured with a VITE_PADDLE_CLIENT_TOKEN in environment variables.');
    return;
  }

  paddle.Checkout.open({
    items: [{ priceId, quantity: 1 }],
    ...(userEmail ? { customer: { email: userEmail } } : {}),
    customData: {
      userId,
      ...customData,
    },
    settings: {
      variant: 'one-page',
      theme: 'dark',
    },
  });
}
