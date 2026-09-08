/**
 * Standalone Paddle Catalog Seeding Script
 * Adheres to `paddle-catalog-setup` skill guidelines.
 *
 * Usage:
 *   PADDLE_API_KEY="pdl_sdbx_apikey_..." npx tsx scripts/seed-paddle-catalog.ts
 */

const apiKey = process.env.PADDLE_API_KEY;
const isProduction = process.env.PADDLE_ENV === 'production';
const baseUrl = isProduction
  ? 'https://api.paddle.com'
  : 'https://sandbox-api.paddle.com';

if (!apiKey) {
  console.error('Error: PADDLE_API_KEY environment variable is required.');
  console.error('Create one in Paddle Dashboard under Developer tools > Authentication > API keys (with product.write and price.write scopes).');
  process.exit(1);
}

async function paddleRequest(endpoint: string, body: any) {
  const res = await fetch(`${baseUrl}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const json: any = await res.json();
  if (!res.ok) {
    throw new Error(`Paddle API error (${res.status}): ${JSON.stringify(json)}`);
  }
  return json.data;
}

async function seed() {
  console.log(`\n🌱 Seeding Paddle Catalog on ${isProduction ? 'PRODUCTION' : 'SANDBOX'}...`);

  // 1. Create Gremlin Pro Product
  console.log('Creating product: Gremlin Pro...');
  const proProduct = await paddleRequest('/products', {
    name: 'Gremlin Pro',
    tax_category: 'saas',
    description: 'Instant cloud AI evaluation, unhinged roasts, and multi-device focus streak sync.',
  });
  console.log(`✓ Created Product: ${proProduct.name} (${proProduct.id})`);

  // 2. Create Pro Monthly Price ($5/mo = 500 cents)
  console.log('Creating price: Pro Monthly ($5/mo)...');
  const proMonthly = await paddleRequest('/prices', {
    product_id: proProduct.id,
    description: 'Gremlin Pro Monthly',
    unit_price: {
      amount: '500', // 500 cents = $5.00 USD
      currency_code: 'USD',
    },
    billing_cycle: {
      interval: 'month',
      frequency: 1,
    },
  });
  console.log(`✓ Created Price: ${proMonthly.description} (${proMonthly.id})`);

  // 3. Create Founder Pass Product & Price ($49 one-time = 4900 cents)
  console.log('Creating product: Gremlin Founder Pass...');
  const founderProduct = await paddleRequest('/products', {
    name: 'Gremlin Founder Pass',
    tax_category: 'saas',
    description: 'Lifetime Pro access for early backers. Focus forever.',
  });
  console.log(`✓ Created Product: ${founderProduct.name} (${founderProduct.id})`);

  console.log('Creating price: Founder Pass One-Time ($49)...');
  const founderPrice = await paddleRequest('/prices', {
    product_id: founderProduct.id,
    description: 'Gremlin Founder Pass Lifetime',
    unit_price: {
      amount: '4900', // 4900 cents = $49.00 USD
      currency_code: 'USD',
    },
  });
  console.log(`✓ Created Price: ${founderPrice.description} (${founderPrice.id})`);

  console.log('\n======================================================');
  console.log('🎉 PADDLE CATALOG PROVISIONED SUCCESSFULLY!');
  console.log('======================================================');
  console.log(`PADDLE_PRO_PRICE_ID="${proMonthly.id}"`);
  console.log(`PADDLE_FOUNDER_PRICE_ID="${founderPrice.id}"`);
  console.log('======================================================');
  console.log('Add these IDs to your apps/backend .env and apps/web .env files.\n');
}

seed().catch((err) => {
  console.error('\n❌ Seeding failed:', err.message);
  process.exit(1);
});
