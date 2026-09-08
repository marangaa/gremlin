import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  bigint,
  real,
  numeric,
  varchar,
  jsonb,
  uuid,
  primaryKey,
  index,
} from 'drizzle-orm/pg-core';

// ==========================================================
// 1. Better Auth Core Tables
// ==========================================================

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
  plan: text('plan').notNull().default('free'),
});

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expiresAt', { withTimezone: true }).notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
    ipAddress: text('ipAddress'),
    userAgent: text('userAgent'),
    userId: text('userId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [index('idx_session_userId').on(table.userId)],
);

export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('accountId').notNull(),
    providerId: text('providerId').notNull(),
    userId: text('userId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('accessToken'),
    refreshToken: text('refreshToken'),
    idToken: text('idToken'),
    accessTokenExpiresAt: timestamp('accessTokenExpiresAt', { withTimezone: true }),
    refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt', { withTimezone: true }),
    scope: text('scope'),
    password: text('password'),
    issuer: text('issuer').notNull().default('local:credential'),
    createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('idx_account_userId').on(table.userId)],
);

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt', { withTimezone: true }).notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
});

export const rateLimit = pgTable(
  'rate_limit',
  {
    id: text('id').primaryKey(),
    key: text('key').notNull(),
    count: integer('count').notNull(),
    lastRequest: bigint('lastRequest', { mode: 'number' }).notNull(),
  },
  (table) => [index('rate_limit_key_idx').on(table.key)],
);

// ==========================================================
// 2. Gremlin Application Tables
// ==========================================================

export const sprints = pgTable(
  'sprints',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('userId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    goal: text('goal').notNull(),
    targetMinutes: integer('targetMinutes').notNull(),
    startedAt: timestamp('startedAt', { withTimezone: true }).notNull(),
    endedAt: timestamp('endedAt', { withTimezone: true }),
    status: varchar('status', { length: 32 }).notNull().default('completed'),
    divergenceCount: integer('divergenceCount').notNull().default(0),
    organismId: varchar('organismId', { length: 32 }).notNull().default('Sarge'),
    remarks: text('remarks').array().default([]),
    createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('idx_sprints_userId').on(table.userId)],
);

export const preferences = pgTable('preferences', {
  userId: text('userId')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  companionId: varchar('companionId', { length: 64 }).notNull().default('nexus'),
  voiceSynth: boolean('voiceSynth').notNull().default(true),
  volume: numeric('volume', { precision: 3, scale: 2 }).notNull().default('0.75'),
  visualVignette: boolean('visualVignette').notNull().default(true),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
});

export const memoryEpisodes = pgTable(
  'memory_episodes',
  {
    id: text('id').primaryKey(),
    userId: text('userId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    ts: bigint('ts', { mode: 'number' }).notNull(),
    type: text('type').notNull(),
    domain: text('domain'),
    detail: text('detail').notNull().default(''),
    goalTitle: text('goalTitle'),
    interventionKind: text('interventionKind'),
    interventionLevel: integer('interventionLevel'),
    outcomeEffective: boolean('outcomeEffective'),
    returnedWithinMin: real('returnedWithinMin'),
    createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('memory_episodes_user_ts_idx').on(table.userId, table.ts)],
);

export const focusProfiles = pgTable('focus_profiles', {
  userId: text('userId')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  data: jsonb('data').notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
});

export const syncGoals = pgTable(
  'sync_goals',
  {
    userId: text('userId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    id: text('id').notNull(),
    title: text('title').notNull(),
    category: text('category').notNull().default('general'),
    estimatedMinutes: integer('estimatedMinutes'),
    isActive: boolean('isActive').notNull().default(true),
    completed: boolean('completed').notNull().default(false),
    createdAt: bigint('createdAt', { mode: 'number' }).notNull(),
    completedAt: bigint('completedAt', { mode: 'number' }),
  },
  (table) => [primaryKey({ columns: [table.userId, table.id] })],
);

export const syncNotes = pgTable(
  'sync_notes',
  {
    userId: text('userId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    id: text('id').notNull(),
    content: text('content').notNull(),
    url: text('url').notNull().default(''),
    domain: text('domain').notNull().default(''),
    pageTitle: text('pageTitle').notNull().default(''),
    snippet: text('snippet'),
    goalId: text('goalId'),
    goalTitle: text('goalTitle'),
    companionId: text('companionId').notNull().default('Sarge'),
    timestamp: bigint('timestamp', { mode: 'number' }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.id] })],
);

export const syncDiaries = pgTable(
  'sync_diaries',
  {
    userId: text('userId')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    date: text('date').notNull(),
    data: jsonb('data').notNull(),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.date] })],
);

// ==========================================================
// 3. Paddle Billing & Subscription Tables
// ==========================================================

export const customers = pgTable(
  'customers',
  {
    customerId: text('customerId').primaryKey(),
    userId: text('userId').references(() => user.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_customers_userId').on(table.userId),
    index('idx_customers_email').on(table.email),
  ],
);

export const subscriptions = pgTable(
  'subscriptions',
  {
    subscriptionId: text('subscriptionId').primaryKey(),
    customerId: text('customerId')
      .notNull()
      .references(() => customers.customerId, { onDelete: 'cascade' }),
    userId: text('userId').references(() => user.id, { onDelete: 'cascade' }),
    status: text('status').notNull(),
    priceId: text('priceId').notNull(),
    productId: text('productId').notNull(),
    scheduledChange: timestamp('scheduledChange', { withTimezone: true }),
    currentBillingPeriodEnd: timestamp('currentBillingPeriodEnd', { withTimezone: true }),
    createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_subscriptions_customerId').on(table.customerId),
    index('idx_subscriptions_userId').on(table.userId),
    index('idx_subscriptions_status').on(table.status),
  ],
);

export const processedWebhooks = pgTable(
  'processed_webhooks',
  {
    eventId: text('eventId').primaryKey(),
    eventType: text('eventType').notNull(),
    processedAt: timestamp('processedAt', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('idx_processed_webhooks_processedAt').on(table.processedAt)],
);
