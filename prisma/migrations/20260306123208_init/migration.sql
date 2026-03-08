/*
  Warnings:

  - You are about to drop the `CollectorPerformance` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CollectorPerformanceConfig` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "RedemptionStatus" AS ENUM ('PENDING', 'APPROVED', 'DELIVERED', 'CANCELLED');

-- DropForeignKey
ALTER TABLE "CitizenPointHistory" DROP CONSTRAINT "CitizenPointHistory_reportId_fkey";

-- DropForeignKey
ALTER TABLE "CollectorPerformance" DROP CONSTRAINT "CollectorPerformance_collectorId_fkey";

-- DropForeignKey
ALTER TABLE "PointTransaction" DROP CONSTRAINT "PointTransaction_reportId_fkey";

-- DropIndex
DROP INDEX "PointTransaction_reportId_type_key";

-- AlterTable
ALTER TABLE "CitizenPointHistory" ALTER COLUMN "reportId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "CollectorStatus" ADD COLUMN     "consecutiveSkipCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "PointTransaction" ALTER COLUMN "reportId" DROP NOT NULL;

-- DropTable
DROP TABLE "CollectorPerformance";

-- DropTable
DROP TABLE "CollectorPerformanceConfig";

-- CreateTable
CREATE TABLE "Gift" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "requiredPoints" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "imageUrl" VARCHAR(255),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Gift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Redemption" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "giftId" INTEGER NOT NULL,
    "pointsUsed" INTEGER NOT NULL,
    "status" "RedemptionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Redemption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Redemption_userId_idx" ON "Redemption"("userId");

-- CreateIndex
CREATE INDEX "PointTransaction_reportId_type_idx" ON "PointTransaction"("reportId", "type");

-- AddForeignKey
ALTER TABLE "CitizenPointHistory" ADD CONSTRAINT "CitizenPointHistory_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointTransaction" ADD CONSTRAINT "PointTransaction_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Redemption" ADD CONSTRAINT "Redemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Redemption" ADD CONSTRAINT "Redemption_giftId_fkey" FOREIGN KEY ("giftId") REFERENCES "Gift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
