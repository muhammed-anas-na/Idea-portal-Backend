-- AlterTable
ALTER TABLE "customer_pages" ADD COLUMN     "calendly_url" TEXT;

-- CreateTable
CREATE TABLE "tracking_sessions" (
    "id" UUID NOT NULL,
    "customer_id" UUID,
    "anon_id" TEXT,
    "user_agent" TEXT,
    "ip_hash" TEXT,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tracking_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracking_events" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "customer_id" UUID,
    "interaction_id" UUID,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tracking_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tracking_sessions_customer_id_idx" ON "tracking_sessions"("customer_id");

-- CreateIndex
CREATE INDEX "tracking_events_customer_id_occurred_at_idx" ON "tracking_events"("customer_id", "occurred_at");

-- CreateIndex
CREATE INDEX "tracking_events_event_type_occurred_at_idx" ON "tracking_events"("event_type", "occurred_at");

-- AddForeignKey
ALTER TABLE "tracking_sessions" ADD CONSTRAINT "tracking_sessions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracking_events" ADD CONSTRAINT "tracking_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "tracking_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
