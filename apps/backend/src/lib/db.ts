import { Pool } from '@neondatabase/serverless';

/**
 * Memoized Neon Serverless Postgres pool per connection string.
 * One pool instance lives per worker isolate regardless of how many
 * consumers (Better Auth, sprint routes) request it.
 */
let cachedPool: Pool | null = null;
let cachedConnectionString: string | null = null;

export function getPool(connectionString: string): Pool {
  if (cachedPool && cachedConnectionString === connectionString) {
    return cachedPool;
  }

  cachedPool = new Pool({ connectionString });
  cachedConnectionString = connectionString;
  return cachedPool;
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
