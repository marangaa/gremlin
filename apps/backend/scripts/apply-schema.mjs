/**
 * Applies apps/backend/src/schema.sql to the Neon database pointed at by
 * DATABASE_URL (read from apps/backend/.env). Idempotent — the schema uses
 * IF NOT EXISTS everywhere.
 *
 * Uses the Neon HTTP SQL endpoint directly (no psql/WebSocket needed).
 *
 * Usage: node scripts/apply-schema.mjs
 */
import { readFileSync } from 'node:fs';
import { neon } from '@neondatabase/serverless';

const envFile = readFileSync(new URL('../.env', import.meta.url), 'utf8');
const match = envFile.match(/^DATABASE_URL=(.+)$/m);
if (!match) {
  console.error('DATABASE_URL not found in apps/backend/.env');
  process.exit(1);
}
const connectionString = match[1].trim().replace(/^["']|["']$/g, '');

// neon() accepts a postgres:// Neon connection string and routes over HTTPS.
const sql = neon(connectionString);

const sqlText = readFileSync(new URL('../src/schema.sql', import.meta.url), 'utf8');
const statements = sqlText
  .split(';')
  .map((s) => s.replace(/--[^\n]*/g, '').trim())
  .filter(Boolean);

for (const [i, statement] of statements.entries()) {
  // Ordinary function usage (no parameters) — DDL sent over the HTTPS endpoint.
  await sql(statement);
  console.log(`✓ statement ${i + 1}/${statements.length}`);
}
console.log(`Schema applied: ${statements.length} statements.`);
