/*
  Warnings:

  - The values [WAITING_CUSTOMER] on the enum `ReportStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "AccuracyBucket" AS ENUM ('MATCH', 'MODERATE', 'HEAVY');

-- CreateEnum
CREATE TYPE "PointTransactionType" AS ENUM ('EARN', 'SPEND', 'REFUND');

-- AlterEnum
ALTER TYPE "CollectorTaskStatus" ADD VALUE 'COLLECTED';

-- AlterEnum
BEGIN;
CREATE TYPE "ReportStatus_new" AS ENUM ('PENDING', 'ACCEPTED', 'ENTERPRISE_RESERVED', 'COLLECTOR_PENDING', 'ASSIGNED', 'ON_THE_WAY', 'ARRIVED', 'COLLECTED', 'COMPLETED', 'FAILED', 'FAILED_NO_RESPONSE', 'REJECTED', 'CANCELLED');
ALTER TABLE "public"."Report" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Report" ALTER COLUMN "status" TYPE "ReportStatus_new" USING ("status"::text::"ReportStatus_new");
ALTER TYPE "ReportStatus" RENAME TO "ReportStatus_old";
ALTER TYPE "ReportStatus_new" RENAME TO "ReportStatus";
DROP TYPE "public"."ReportStatus_old";
ALTER TABLE "Report" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterTable
ALTER TABLE "Collector" ADD COLUMN     "earnings" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "CollectorStatus" ADD COLUMN     "lastActivityAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "accuracyBucket" "AccuracyBucket",
ADD COLUMN     "actualWeight" DECIMAL(8,2),
ADD COLUMN     "arrivalDeadline" TIMESTAMP(3),
ADD COLUMN     "arrivedAt" TIMESTAMP(3),
ADD COLUMN     "collectedAt" TIMESTAMP(3),
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "evidenceImages" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "balance" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "PointTransaction" (
    "id" SERIAL NOT NULL,
    "reportId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" "PointTransactionType" NOT NULL DEFAULT 'EARN',
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PointTransaction_userId_idx" ON "PointTransaction"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PointTransaction_reportId_type_key" ON "PointTransaction"("reportId", "type");

-- CreateIndex
CREATE INDEX "CollectorStatus_lastActivityAt_idx" ON "CollectorStatus"("lastActivityAt");

-- AddForeignKey
ALTER TABLE "PointTransaction" ADD CONSTRAINT "PointTransaction_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointTransaction" ADD CONSTRAINT "PointTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
