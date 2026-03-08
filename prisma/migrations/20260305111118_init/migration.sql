-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ReportStatus" ADD VALUE 'FAILED_CITIZEN_NOT_HOME';
ALTER TYPE "ReportStatus" ADD VALUE 'RESCHEDULED';

-- AlterTable
ALTER TABLE "CollectorStatus" ADD COLUMN     "lastAssignedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "CollectorPerformance" (
    "collectorId" INTEGER NOT NULL,
    "totalTasks" INTEGER NOT NULL DEFAULT 0,
    "successfulCollections" INTEGER NOT NULL DEFAULT 0,
    "failedCollections" INTEGER NOT NULL DEFAULT 0,
    "noResponseCases" INTEGER NOT NULL DEFAULT 0,
    "citizenNotHomeCases" INTEGER NOT NULL DEFAULT 0,
    "completionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectorPerformance_pkey" PRIMARY KEY ("collectorId")
);

-- AddForeignKey
ALTER TABLE "CollectorPerformance" ADD CONSTRAINT "CollectorPerformance_collectorId_fkey" FOREIGN KEY ("collectorId") REFERENCES "Collector"("id") ON DELETE CASCADE ON UPDATE CASCADE;
