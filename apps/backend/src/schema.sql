-- ==========================================================
-- Gremlin Database Schema (Neon PostgreSQL / Better Auth)
-- ==========================================================

-- 1. Better Auth Core Tables

CREATE TABLE IF NOT EXISTS "user" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "emailVerified" BOOLEAN NOT NULL DEFAULT FALSE,
  "image" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "session" (
  "id" TEXT PRIMARY KEY,
  "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
  "token" TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "account" (
  "id" TEXT PRIMARY KEY,
  "accountId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "accessToken" TEXT,
  "refreshToken" TEXT,
  "idToken" TEXT,
  "accessTokenExpiresAt" TIMESTAMP WITH TIME ZONE,
  "refreshTokenExpiresAt" TIMESTAMP WITH TIME ZONE,
  "scope" TEXT,
  "password" TEXT,
  -- Better Auth >= 1.7: account identity scoped by issuer.
  -- Credential (email/password) accounts use the synthetic issuer "local:credential".
  "issuer" TEXT NOT NULL DEFAULT 'local:credential',
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Billing tier column backing Better Auth `user.additionalFields.plan`.
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "plan" TEXT NOT NULL DEFAULT 'free';

-- Companion id on sprints for cross-device rendering.
ALTER TABLE "sprints" ADD COLUMN IF NOT EXISTS "organismId" VARCHAR(32) NOT NULL DEFAULT 'Sarge';

-- Issuer backfill for pre-1.7 credential accounts (matches createLocalAccountIssuer).
UPDATE "account" SET "issuer" = 'local:credential' WHERE "providerId" = 'credential' AND "issuer" IS DISTINCT FROM 'local:credential';
CREATE UNIQUE INDEX IF NOT EXISTS "account_issuer_accountId_idx" ON "account"("issuer", "accountId");

-- Better Auth rate limiting persistence (storage: 'database').
CREATE TABLE IF NOT EXISTS "rate_limit" (
  "id" TEXT PRIMARY KEY,
  "key" TEXT NOT NULL,
  "count" INTEGER NOT NULL,
  "lastRequest" BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS "rate_limit_key_idx" ON "rate_limit"("key");

CREATE TABLE IF NOT EXISTS "verification" (
  "id" TEXT PRIMARY KEY,
  "identifier" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2. Gremlin Application Tables

CREATE TABLE IF NOT EXISTS "sprints" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "goal" TEXT NOT NULL,
  "targetMinutes" INTEGER NOT NULL,
  "startedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
  "endedAt" TIMESTAMP WITH TIME ZONE,
  "status" VARCHAR(32) NOT NULL DEFAULT 'completed',
  "divergenceCount" INTEGER NOT NULL DEFAULT 0,
  "organismId" VARCHAR(32) NOT NULL DEFAULT 'Sarge',
  "remarks" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "preferences" (
  "userId" TEXT PRIMARY KEY REFERENCES "user"("id") ON DELETE CASCADE,
  "companionId" VARCHAR(64) NOT NULL DEFAULT 'nexus',
  "voiceSynth" BOOLEAN NOT NULL DEFAULT TRUE,
  "volume" NUMERIC(3, 2) NOT NULL DEFAULT 0.75,
  "visualVignette" BOOLEAN NOT NULL DEFAULT TRUE,
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indices for rapid querying
CREATE INDEX IF NOT EXISTS "idx_session_userId" ON "session"("userId");
CREATE INDEX IF NOT EXISTS "idx_account_userId" ON "account"("userId");
CREATE INDEX IF NOT EXISTS "idx_sprints_userId" ON "sprints"("userId");

-- ==========================================================
-- Memory Sync (episodes + focus profile mirror)
-- ==========================================================

CREATE TABLE IF NOT EXISTS "memory_episodes" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "ts" BIGINT NOT NULL,
  "type" TEXT NOT NULL,
  "domain" TEXT,
  "detail" TEXT NOT NULL DEFAULT '',
  "goalTitle" TEXT,
  "interventionKind" TEXT,
  "interventionLevel" INTEGER,
  "outcomeEffective" BOOLEAN,
  "returnedWithinMin" REAL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "memory_episodes_user_ts_idx" ON "memory_episodes" ("userId", "ts" DESC);

CREATE TABLE IF NOT EXISTS "focus_profiles" (
  "userId" TEXT PRIMARY KEY REFERENCES "user"("id") ON DELETE CASCADE,
  "data" JSONB NOT NULL,
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
