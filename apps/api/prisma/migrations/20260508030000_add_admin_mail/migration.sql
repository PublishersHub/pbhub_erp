-- CreateTable
CREATE TABLE "admin_mail_messages" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "recipient_count" INTEGER NOT NULL,
    "recipients" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_mail_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_mail_messages_organization_id_created_at_idx" ON "admin_mail_messages"("organization_id", "created_at");

-- AddForeignKey
ALTER TABLE "admin_mail_messages" ADD CONSTRAINT "admin_mail_messages_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_mail_messages" ADD CONSTRAINT "admin_mail_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
