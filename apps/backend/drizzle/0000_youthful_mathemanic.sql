CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamp with time zone,
	"refreshTokenExpiresAt" timestamp with time zone,
	"scope" text,
	"password" text,
	"issuer" text DEFAULT 'local:credential' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "focus_profiles" (
	"userId" text PRIMARY KEY NOT NULL,
	"data" jsonb NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memory_episodes" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"ts" bigint NOT NULL,
	"type" text NOT NULL,
	"domain" text,
	"detail" text DEFAULT '' NOT NULL,
	"goalTitle" text,
	"interventionKind" text,
	"interventionLevel" integer,
	"outcomeEffective" boolean,
	"returnedWithinMin" real,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "preferences" (
	"userId" text PRIMARY KEY NOT NULL,
	"companionId" varchar(64) DEFAULT 'nexus' NOT NULL,
	"voiceSynth" boolean DEFAULT true NOT NULL,
	"volume" numeric(3, 2) DEFAULT '0.75' NOT NULL,
	"visualVignette" boolean DEFAULT true NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limit" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"lastRequest" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"userId" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "sprints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" text NOT NULL,
	"goal" text NOT NULL,
	"targetMinutes" integer NOT NULL,
	"startedAt" timestamp with time zone NOT NULL,
	"endedAt" timestamp with time zone,
	"status" varchar(32) DEFAULT 'completed' NOT NULL,
	"divergenceCount" integer DEFAULT 0 NOT NULL,
	"organismId" varchar(32) DEFAULT 'Sarge' NOT NULL,
	"remarks" text[] DEFAULT '{}',
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_devices" (
	"userId" text NOT NULL,
	"deviceId" text NOT NULL,
	"name" text,
	"lastSeenAt" timestamp with time zone DEFAULT now() NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sync_devices_userId_deviceId_pk" PRIMARY KEY("userId","deviceId")
);
--> statement-breakpoint
CREATE TABLE "sync_diaries" (
	"userId" text NOT NULL,
	"date" text NOT NULL,
	"data" jsonb NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sync_diaries_userId_date_pk" PRIMARY KEY("userId","date")
);
--> statement-breakpoint
CREATE TABLE "sync_goals" (
	"userId" text NOT NULL,
	"id" text NOT NULL,
	"title" text NOT NULL,
	"category" text DEFAULT 'general' NOT NULL,
	"estimatedMinutes" integer,
	"isActive" boolean DEFAULT true NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"createdAt" bigint NOT NULL,
	"completedAt" bigint,
	CONSTRAINT "sync_goals_userId_id_pk" PRIMARY KEY("userId","id")
);
--> statement-breakpoint
CREATE TABLE "sync_notes" (
	"userId" text NOT NULL,
	"id" text NOT NULL,
	"content" text NOT NULL,
	"url" text DEFAULT '' NOT NULL,
	"domain" text DEFAULT '' NOT NULL,
	"pageTitle" text DEFAULT '' NOT NULL,
	"snippet" text,
	"goalId" text,
	"goalTitle" text,
	"companionId" text DEFAULT 'Sarge' NOT NULL,
	"timestamp" bigint NOT NULL,
	CONSTRAINT "sync_notes_userId_id_pk" PRIMARY KEY("userId","id")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"image" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"plan" text DEFAULT 'free' NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "waitlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"source" text DEFAULT 'website' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "waitlist_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "focus_profiles" ADD CONSTRAINT "focus_profiles_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memory_episodes" ADD CONSTRAINT "memory_episodes_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preferences" ADD CONSTRAINT "preferences_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sprints" ADD CONSTRAINT "sprints_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_devices" ADD CONSTRAINT "sync_devices_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_diaries" ADD CONSTRAINT "sync_diaries_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_goals" ADD CONSTRAINT "sync_goals_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_notes" ADD CONSTRAINT "sync_notes_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_account_userId" ON "account" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "memory_episodes_user_ts_idx" ON "memory_episodes" USING btree ("userId","ts");--> statement-breakpoint
CREATE INDEX "rate_limit_key_idx" ON "rate_limit" USING btree ("key");--> statement-breakpoint
CREATE INDEX "idx_session_userId" ON "session" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "idx_sprints_userId" ON "sprints" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "idx_waitlist_email" ON "waitlist" USING btree ("email");