-- CreateEnum
CREATE TYPE "interaction_kind" AS ENUM ('post', 'comment', 'reply', 'vote');

-- CreateEnum
CREATE TYPE "customer_status" AS ENUM ('draft', 'ready', 'published');

-- CreateTable
CREATE TABLE "feebak_products" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT NOT NULL,
    "logo_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "feebak_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "token" TEXT NOT NULL,
    "status" "customer_status" NOT NULL DEFAULT 'draft',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interactions" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "source_url" TEXT NOT NULL,
    "source_id" TEXT,
    "kind" "interaction_kind" NOT NULL,
    "occurred_on" DATE,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "raw" JSONB,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interaction_answers" (
    "id" UUID NOT NULL,
    "interaction_id" UUID NOT NULL,
    "content_html" TEXT NOT NULL,
    "product_id" UUID,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "interaction_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_pages" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "intro_html" TEXT NOT NULL DEFAULT '',
    "outro_html" TEXT NOT NULL DEFAULT '',
    "accent_color" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "customer_pages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "feebak_products_slug_key" ON "feebak_products"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "customers_email_key" ON "customers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "customers_token_key" ON "customers"("token");

-- CreateIndex
CREATE INDEX "customers_status_idx" ON "customers"("status");

-- CreateIndex
CREATE INDEX "interactions_customer_id_idx" ON "interactions"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "interactions_customer_id_source_url_key" ON "interactions"("customer_id", "source_url");

-- CreateIndex
CREATE UNIQUE INDEX "interaction_answers_interaction_id_key" ON "interaction_answers"("interaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_pages_customer_id_key" ON "customer_pages"("customer_id");

-- AddForeignKey
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interaction_answers" ADD CONSTRAINT "interaction_answers_interaction_id_fkey" FOREIGN KEY ("interaction_id") REFERENCES "interactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interaction_answers" ADD CONSTRAINT "interaction_answers_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "feebak_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_pages" ADD CONSTRAINT "customer_pages_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
