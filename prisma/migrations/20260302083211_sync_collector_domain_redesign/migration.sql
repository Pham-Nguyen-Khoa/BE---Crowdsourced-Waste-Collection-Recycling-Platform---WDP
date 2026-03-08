/*
  Warnings:

  - The values [AVAILABLE,ON_TASK] on the enum `CollectorAvailability` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `status` on the `CollectorStatus` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[enterpriseId,employeeCode]` on the table `Collector` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `employeeCode` to the `Collector` table without a default value. This is not possible if the table is not empty.
  - Added the required column `primaryZoneId` to the `Collector` table without a default value. This is not possible if the table is not empty.
  - Added the required column `workingHours` to the `Collector` table without a default value. This is not possible if the table is not empty.
  - Added the required column `enterpriseId` to the `Zone` table without a default value. This is not possible if the table is not empty.
  - Added the required column `provinceCode` to the `Zone` table without a default value. This is not possible if the table is not empty.

*/

-- CreateTable (Zone - Redesigned)
CREATE TABLE "Zone" (
    "id" SERIAL NOT NULL,
    "enterpriseId" INTEGER NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "provinceCode" VARCHAR(10) NOT NULL,
    "districtCode" VARCHAR(10),
    "wardCode" VARCHAR(10),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Zone_pkey" PRIMARY KEY ("id")
);

-- AlterEnum
BEGIN;
CREATE TYPE "CollectorAvailability_new" AS ENUM ('OFFLINE', 'ONLINE_AVAILABLE', 'ONLINE_BUSY');
-- Since we are dropping the column status later, we don't need to migrate data here, 
-- but we must ensure the new type is ready for the new column.
COMMIT;

-- AlterTable (Collector)
ALTER TABLE "Collector" ADD COLUMN     "employeeCode" TEXT NOT NULL,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "primaryZoneId" INTEGER NOT NULL,
ADD COLUMN     "secondaryZoneId" INTEGER,
ADD COLUMN     "trustScore" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "workingHours" JSONB NOT NULL;

-- AlterTable (CollectorStatus)
ALTER TABLE "CollectorStatus" DROP COLUMN "status";
ALTER TABLE "CollectorStatus" ADD COLUMN     "availability" "CollectorAvailability_new" NOT NULL DEFAULT 'OFFLINE',
ADD COLUMN     "currentLatitude" DOUBLE PRECISION,
ADD COLUMN     "currentLongitude" DOUBLE PRECISION,
ADD COLUMN     "deviceId" VARCHAR(255);

-- Cleanup Enum
ALTER TYPE "CollectorAvailability" RENAME TO "CollectorAvailability_old";
ALTER TYPE "CollectorAvailability_new" RENAME TO "CollectorAvailability";
DROP TYPE "CollectorAvailability_old";

-- CreateIndex (Zone)
CREATE INDEX "Zone_enterpriseId_idx" ON "Zone"("enterpriseId");
CREATE INDEX "Zone_provinceCode_districtCode_wardCode_idx" ON "Zone"("provinceCode", "districtCode", "wardCode");
CREATE UNIQUE INDEX "Zone_enterpriseId_code_key" ON "Zone"("enterpriseId", "code");
CREATE INDEX "Zone_deletedAt_idx" ON "Zone"("deletedAt");

-- CreateIndex (Collector)
CREATE INDEX "Collector_enterpriseId_primaryZoneId_idx" ON "Collector"("enterpriseId", "primaryZoneId");
CREATE INDEX "Collector_enterpriseId_secondaryZoneId_idx" ON "Collector"("enterpriseId", "secondaryZoneId");
CREATE UNIQUE INDEX "Collector_enterpriseId_employeeCode_key" ON "Collector"("enterpriseId", "employeeCode");

-- CreateIndex (CollectorStatus)
CREATE INDEX "CollectorStatus_availability_idx" ON "CollectorStatus"("availability");
CREATE INDEX "CollectorStatus_currentLatitude_currentLongitude_idx" ON "CollectorStatus"("currentLatitude", "currentLongitude");

-- AddForeignKey (Zone)
ALTER TABLE "Zone" ADD CONSTRAINT "Zone_enterpriseId_fkey" FOREIGN KEY ("enterpriseId") REFERENCES "Enterprise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey (Collector)
ALTER TABLE "Collector" ADD CONSTRAINT "Collector_primaryZoneId_fkey" FOREIGN KEY ("primaryZoneId") REFERENCES "Zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Collector" ADD CONSTRAINT "Collector_secondaryZoneId_fkey" FOREIGN KEY ("secondaryZoneId") REFERENCES "Zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
