-- CreateEnum
CREATE TYPE "SuggestionCategory" AS ENUM ('WORKPLACE', 'PROCESS', 'TOOLS', 'CULTURE', 'COMPENSATION', 'OTHER');

-- CreateEnum
CREATE TYPE "SuggestionStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'IMPLEMENTED', 'DECLINED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "suggestions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "author_id" TEXT,
    "is_anonymous" BOOLEAN NOT NULL DEFAULT false,
    "category" "SuggestionCategory" NOT NULL DEFAULT 'OTHER',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "SuggestionStatus" NOT NULL DEFAULT 'OPEN',
    "response_body" TEXT,
    "responded_by_id" TEXT,
    "responded_at" TIMESTAMP(3),
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "suggestions_organization_id_status_created_at_idx" ON "suggestions"("organization_id", "status", "created_at");

-- AddForeignKey
ALTER TABLE "suggestions" ADD CONSTRAINT "suggestions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suggestions" ADD CONSTRAINT "suggestions_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suggestions" ADD CONSTRAINT "suggestions_responded_by_id_fkey" FOREIGN KEY ("responded_by_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
