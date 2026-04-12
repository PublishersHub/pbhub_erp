-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT,
    "event_type" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "recipient_user_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "reference_id" TEXT,
    "reference_type" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_delivery_logs" (
    "id" TEXT NOT NULL,
    "notification_id" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "status" "NotificationStatus" NOT NULL,
    "error_message" TEXT,
    "delivered_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_delivery_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notification_templates_organization_id_idx" ON "notification_templates"("organization_id");

-- CreateIndex
CREATE INDEX "notification_templates_event_type_idx" ON "notification_templates"("event_type");

-- CreateIndex
CREATE INDEX "notification_preferences_user_id_idx" ON "notification_preferences"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_user_id_event_type_channel_key" ON "notification_preferences"("user_id", "event_type", "channel");

-- CreateIndex
CREATE INDEX "notifications_organization_id_idx" ON "notifications"("organization_id");

-- CreateIndex
CREATE INDEX "notifications_recipient_user_id_is_read_idx" ON "notifications"("recipient_user_id", "is_read");

-- CreateIndex
CREATE INDEX "notifications_recipient_user_id_is_archived_idx" ON "notifications"("recipient_user_id", "is_archived");

-- CreateIndex
CREATE INDEX "notifications_event_type_idx" ON "notifications"("event_type");

-- CreateIndex
CREATE INDEX "notifications_reference_id_reference_type_idx" ON "notifications"("reference_id", "reference_type");

-- CreateIndex
CREATE INDEX "notification_delivery_logs_notification_id_idx" ON "notification_delivery_logs"("notification_id");

-- CreateIndex
CREATE INDEX "notification_delivery_logs_status_idx" ON "notification_delivery_logs"("status");

-- AddForeignKey
ALTER TABLE "notification_templates" ADD CONSTRAINT "notification_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_delivery_logs" ADD CONSTRAINT "notification_delivery_logs_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Partial unique index: system default templates (organization_id IS NULL)
CREATE UNIQUE INDEX "notification_templates_system_default_unique"
ON "notification_templates" ("event_type", "channel")
WHERE "organization_id" IS NULL;

-- Partial unique index: org-specific templates (organization_id IS NOT NULL)
CREATE UNIQUE INDEX "notification_templates_org_unique"
ON "notification_templates" ("organization_id", "event_type", "channel")
WHERE "organization_id" IS NOT NULL;
