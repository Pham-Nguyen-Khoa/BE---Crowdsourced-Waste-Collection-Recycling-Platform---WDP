/*
  Warnings:

  - You are about to drop the `CitizenPointHistory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PointConfig` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Redemption` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "CitizenPointHistory" DROP CONSTRAINT "CitizenPointHistory_citizenId_fkey";

-- DropForeignKey
ALTER TABLE "CitizenPointHistory" DROP CONSTRAINT "CitizenPointHistory_reportId_fkey";

-- DropForeignKey
ALTER TABLE "Redemption" DROP CONSTRAINT "Redemption_giftId_fkey";

-- DropForeignKey
ALTER TABLE "Redemption" DROP CONSTRAINT "Redemption_userId_fkey";

-- AlterTable
ALTER TABLE "PointTransaction" ADD COLUMN     "description" VARCHAR(255),
ADD COLUMN     "giftId" INTEGER;

-- DropTable
DROP TABLE "CitizenPointHistory";

-- DropTable
DROP TABLE "PointConfig";

-- DropTable
DROP TABLE "Redemption";

-- DropEnum
DROP TYPE "RedemptionStatus";

-- CreateTable
CREATE TABLE "ReportActualWaste" (
    "id" SERIAL NOT NULL,
    "reportId" INTEGER NOT NULL,
    "wasteType" "WasteType" NOT NULL,
    "weightKg" DECIMAL(8,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportActualWaste_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PointTransaction_giftId_idx" ON "PointTransaction"("giftId");

-- AddForeignKey
ALTER TABLE "ReportActualWaste" ADD CONSTRAINT "ReportActualWaste_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointTransaction" ADD CONSTRAINT "PointTransaction_giftId_fkey" FOREIGN KEY ("giftId") REFERENCES "Gift"("id") ON DELETE SET NULL ON UPDATE CASCADE;
