-- CreateEnum
CREATE TYPE "CollectorTaskStatus" AS ENUM ('PENDING_COLLECTOR', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ReportStatus" ADD VALUE 'ENTERPRISE_RESERVED';
ALTER TYPE "ReportStatus" ADD VALUE 'COLLECTOR_PENDING';

-- DropForeignKey
ALTER TABLE "Collector" DROP CONSTRAINT "Collector_primaryZoneId_fkey";

-- DropForeignKey
ALTER TABLE "Collector" DROP CONSTRAINT "Collector_secondaryZoneId_fkey";

-- DropIndex
DROP INDEX "CitizenPointHistory_citizenId_idx";

-- DropIndex
DROP INDEX "CitizenPointHistory_createdAt_idx";

-- DropIndex
DROP INDEX "CitizenPointHistory_reportId_idx";

-- DropIndex
DROP INDEX "Collector_deletedAt_idx";

-- DropIndex
DROP INDEX "Collector_enterpriseId_primaryZoneId_idx";

-- DropIndex
DROP INDEX "Collector_enterpriseId_secondaryZoneId_idx";

-- DropIndex
DROP INDEX "CollectorStatus_currentLatitude_currentLongitude_idx";

-- DropIndex
DROP INDEX "Complaint_citizenId_idx";

-- DropIndex
DROP INDEX "Complaint_reportId_idx";

-- DropIndex
DROP INDEX "Complaint_status_idx";

-- DropIndex
DROP INDEX "DispatchLog_level_idx";

-- DropIndex
DROP INDEX "Notification_createdAt_idx";

-- DropIndex
DROP INDEX "Notification_isRead_idx";

-- DropIndex
DROP INDEX "Notification_type_idx";

-- DropIndex
DROP INDEX "Notification_userId_idx";

-- DropIndex
DROP INDEX "PasswordReset_createdAt_idx";

-- DropIndex
DROP INDEX "PasswordReset_userID_idx";

-- DropIndex
DROP INDEX "Payment_expiresAt_idx";

-- DropIndex
DROP INDEX "Payment_webhookId_idx";

-- DropIndex
DROP INDEX "PointConfig_wasteType_idx";

-- DropIndex
DROP INDEX "Report_createdAt_idx";

-- DropIndex
DROP INDEX "Report_deletedAt_idx";

-- DropIndex
DROP INDEX "Report_latitude_longitude_idx";

-- DropIndex
DROP INDEX "Report_provinceCode_districtCode_wardCode_idx";

-- DropIndex
DROP INDEX "ReportAssignment_assignedAt_idx";

-- DropIndex
DROP INDEX "ReportAssignment_collectorId_idx";

-- DropIndex
DROP INDEX "ReportEnterpriseAttempt_reportId_priorityOrder_idx";

-- DropIndex
DROP INDEX "ReportEnterpriseAttempt_sentAt_idx";

-- DropIndex
DROP INDEX "ReportEnterpriseAttempt_status_sentAt_idx";

-- DropIndex
DROP INDEX "ReportEvaluation_finalPoint_idx";

-- DropIndex
DROP INDEX "ReportEvaluation_reportId_idx";

-- DropIndex
DROP INDEX "ReportEvaluation_wasteAccuracy_idx";

-- DropIndex
DROP INDEX "ReportWaste_reportId_idx";

-- DropIndex
DROP INDEX "ReportWaste_wasteType_idx";

-- DropIndex
DROP INDEX "Subscription_isActive_endDate_idx";

-- DropIndex
DROP INDEX "Subscription_subscriptionPlanConfigId_idx";

-- DropIndex
DROP INDEX "SubscriptionPlanConfig_durationMonths_idx";

-- DropIndex
DROP INDEX "Zone_deletedAt_idx";

-- DropIndex
DROP INDEX "Zone_provinceCode_districtCode_wardCode_idx";

-- AlterTable
ALTER TABLE "Collector" ADD COLUMN     "skipCount" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "primaryZoneId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "CollectorStatus" ADD COLUMN     "queueLength" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Zone" ADD COLUMN     "boundary" JSONB;

-- CreateTable
CREATE TABLE "CollectorTaskAttempt" (
    "id" SERIAL NOT NULL,
    "reportId" INTEGER NOT NULL,
    "collectorId" INTEGER NOT NULL,
    "enterpriseId" INTEGER NOT NULL,
    "status" "CollectorTaskStatus" NOT NULL DEFAULT 'PENDING_COLLECTOR',
    "attemptOrder" INTEGER NOT NULL,
    "expiredAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectorTaskAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CollectorTaskAttempt_reportId_status_idx" ON "CollectorTaskAttempt"("reportId", "status");

-- CreateIndex
CREATE INDEX "CollectorTaskAttempt_status_expiredAt_idx" ON "CollectorTaskAttempt"("status", "expiredAt");

-- AddForeignKey
ALTER TABLE "Collector" ADD CONSTRAINT "Collector_primaryZoneId_fkey" FOREIGN KEY ("primaryZoneId") REFERENCES "Zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collector" ADD CONSTRAINT "Collector_secondaryZoneId_fkey" FOREIGN KEY ("secondaryZoneId") REFERENCES "Zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectorTaskAttempt" ADD CONSTRAINT "CollectorTaskAttempt_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectorTaskAttempt" ADD CONSTRAINT "CollectorTaskAttempt_collectorId_fkey" FOREIGN KEY ("collectorId") REFERENCES "Collector"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectorTaskAttempt" ADD CONSTRAINT "CollectorTaskAttempt_enterpriseId_fkey" FOREIGN KEY ("enterpriseId") REFERENCES "Enterprise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
