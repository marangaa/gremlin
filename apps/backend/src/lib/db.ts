import { Pool } from '@neondatabase/serverless';
import { drizzle, type NeonDatabase } from 'drizzle-orm/neon-serverless';
import * as schema from '../db/schema';

export * from '../db/schema';

/**
 * Memoized Neon Serverless Postgres pool & Drizzle instance per connection string.
 * One instance lives per worker isolate regardless of how many consumers request it.
 */
let cachedPool: Pool | null = null;
let cachedConnectionString: string | null = null;
let cachedDb: NeonDatabase<typeof schema> | null = null;

export function getPool(connectionString: string): Pool {
  if (cachedPool && cachedConnectionString === connectionString) {
    return cachedPool;
  }

  cachedPool = new Pool({ connectionString });
  cachedConnectionString = connectionString;
  cachedDb = drizzle(cachedPool, { schema });
  return cachedPool;
}

export function getDb(connectionString: string): NeonDatabase<typeof schema> {
  if (cachedDb && cachedConnectionString === connectionString) {
    return cachedDb;
  }

  getPool(connectionString);
  return cachedDb!;
}

/**
 * Row shape of the `sprints` table.
 */
export interface SprintRow {
  id: string;
  userId: string;
  goal: string;
  targetMinutes: number;
  startedAt: Date;
  endedAt: Date | null;
  status: string;
  divergenceCount: number;
  organismId: string;
  createdAt: Date;
}

/** Maps a snake_case DB row to the camelCase API shape. */
export function mapSprintRow(row: SprintRow) {
  return {
    id: row.id,
    userId: row.userId,
    goal: row.goal,
    targetMinutes: row.targetMinutes,
    startedAt: new Date(row.startedAt).getTime(),
    endedAt: row.endedAt ? new Date(row.endedAt).getTime() : null,
    status: row.status,
    divergenceCount: Number(row.divergenceCount),
    organismId: row.organismId,
    createdAt: new Date(row.createdAt).getTime(),
  };
}
