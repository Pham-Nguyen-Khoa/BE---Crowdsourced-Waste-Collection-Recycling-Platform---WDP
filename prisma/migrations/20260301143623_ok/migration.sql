-- DropForeignKey
ALTER TABLE "CollectorStatus" DROP CONSTRAINT "CollectorStatus_collectorId_fkey";

-- AlterTable
ALTER TABLE "CollectorStatus" ADD COLUMN     "lastOfflineAt" TIMESTAMP(3),
ADD COLUMN     "lastOnlineAt" TIMESTAMP(3),
ALTER COLUMN "status" SET DEFAULT 'OFFLINE';

-- AddForeignKey
ALTER TABLE "CollectorStatus" ADD CONSTRAINT "CollectorStatus_collectorId_fkey" FOREIGN KEY ("collectorId") REFERENCES "Collector"("id") ON DELETE CASCADE ON UPDATE CASCADE;
