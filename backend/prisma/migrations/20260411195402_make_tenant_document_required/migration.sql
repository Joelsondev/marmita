-- Set empty string for existing rows with NULL document
UPDATE "Tenant" SET "document" = '' WHERE "document" IS NULL;

-- AlterTable
ALTER TABLE "Tenant" ALTER COLUMN "document" SET NOT NULL;
