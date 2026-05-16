/*
  Warnings:

  - You are about to drop the column `token` on the `customers` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "customers_token_key";

-- AlterTable
ALTER TABLE "customers" DROP COLUMN "token";

-- AlterTable
ALTER TABLE "tracking_events" ADD COLUMN     "tracking_link_id" UUID;

-- AlterTable
ALTER TABLE "tracking_sessions" ADD COLUMN     "tracking_link_id" UUID;

-- CreateTable
CREATE TABLE "use_cases" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "content_html" TEXT NOT NULL,
    "product_id" UUID,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "use_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracking_links" (
    "id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "customer_id" UUID,
    "interaction_id" UUID,
    "label" VARCHAR(200),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tracking_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "use_cases_is_published_idx" ON "use_cases"("is_published");

-- CreateIndex
CREATE UNIQUE INDEX "tracking_links_token_key" ON "tracking_links"("token");

-- CreateIndex
CREATE INDEX "tracking_links_customer_id_idx" ON "tracking_links"("customer_id");

-- CreateIndex
CREATE INDEX "tracking_events_tracking_link_id_occurred_at_idx" ON "tracking_events"("tracking_link_id", "occurred_at");

-- CreateIndex
CREATE INDEX "tracking_sessions_tracking_link_id_idx" ON "tracking_sessions"("tracking_link_id");

-- AddForeignKey
ALTER TABLE "use_cases" ADD CONSTRAINT "use_cases_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "feebak_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracking_links" ADD CONSTRAINT "tracking_links_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracking_links" ADD CONSTRAINT "tracking_links_interaction_id_fkey" FOREIGN KEY ("interaction_id") REFERENCES "interactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracking_sessions" ADD CONSTRAINT "tracking_sessions_tracking_link_id_fkey" FOREIGN KEY ("tracking_link_id") REFERENCES "tracking_links"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracking_events" ADD CONSTRAINT "tracking_events_tracking_link_id_fkey" FOREIGN KEY ("tracking_link_id") REFERENCES "tracking_links"("id") ON DELETE SET NULL ON UPDATE CASCADE;
