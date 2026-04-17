-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "blockReason" TEXT,
ADD COLUMN     "isBlocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastNoShowAt" TIMESTAMP(3),
ADD COLUMN     "noShowCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "DiscountRule" ADD COLUMN     "maxNoShowsBeforeBlock" INTEGER NOT NULL DEFAULT 3;
