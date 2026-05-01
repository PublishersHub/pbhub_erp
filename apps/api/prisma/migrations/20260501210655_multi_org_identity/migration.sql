-- CreateTable accounts - global identity
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex accounts_email_key
CREATE UNIQUE INDEX "accounts_email_key" ON "accounts"("email");

-- Move identity data from users to accounts (already done in pre-migration step)
-- Drop the old identity columns from users table
ALTER TABLE "users" DROP COLUMN IF EXISTS "email";
ALTER TABLE "users" DROP COLUMN IF EXISTS "password_hash";
ALTER TABLE "users" DROP COLUMN IF EXISTS "first_name";
ALTER TABLE "users" DROP COLUMN IF EXISTS "last_name";
ALTER TABLE "users" DROP COLUMN IF EXISTS "last_login_at";

-- Add account_id FK to users
ALTER TABLE "users" ADD COLUMN "account_id" TEXT NOT NULL;

-- CreateIndex users_account_id_idx
CREATE INDEX "users_account_id_idx" ON "users"("account_id");

-- CreateIndex users_account_id_organization_id_key - unique constraint per org per account
CREATE UNIQUE INDEX "users_account_id_organization_id_key" ON "users"("account_id", "organization_id");

-- AddForeignKey users -> accounts
ALTER TABLE "users" ADD CONSTRAINT "users_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop old unique constraint on users if it exists
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_organization_id_email_key";

-- Migrate refresh_tokens from user_id to account_id
ALTER TABLE "refresh_tokens" DROP COLUMN IF EXISTS "user_id";
ALTER TABLE "refresh_tokens" ADD COLUMN "account_id" TEXT NOT NULL;

-- CreateIndex refresh_tokens_account_id_idx
CREATE INDEX "refresh_tokens_account_id_idx" ON "refresh_tokens"("account_id");

-- AddForeignKey refresh_tokens -> accounts
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
