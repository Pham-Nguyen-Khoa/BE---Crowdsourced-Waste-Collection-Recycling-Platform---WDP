/*
  Warnings:

  - You are about to drop the column `enterpriseDraftId` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the `EnterpriseDraft` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EnterpriseDraftServiceArea` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EnterpriseDraftWasteType` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EnterpriseDraftWorkingHour` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `enterpriseId` to the `Payment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "EnterpriseStatus" ADD VALUE 'PENDING';

-- DropForeignKey
ALTER TABLE "EnterpriseDraft" DROP CONSTRAINT "EnterpriseDraft_subscriptionPlanConfigId_fkey";

-- DropForeignKey
ALTER TABLE "EnterpriseDraft" DROP CONSTRAINT "EnterpriseDraft_userId_fkey";

-- DropForeignKey
ALTER TABLE "EnterpriseDraftServiceArea" DROP CONSTRAINT "EnterpriseDraftServiceArea_enterpriseDraftId_fkey";

-- DropForeignKey
ALTER TABLE "EnterpriseDraftWasteType" DROP CONSTRAINT "EnterpriseDraftWasteType_enterpriseDraftId_fkey";

-- DropForeignKey
ALTER TABLE "EnterpriseDraftWorkingHour" DROP CONSTRAINT "EnterpriseDraftWorkingHour_enterpriseDraftId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_enterpriseDraftId_fkey";

-- DropIndex
DROP INDEX "Payment_enterpriseDraftId_idx";

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "enterpriseDraftId",
ADD COLUMN     "enterpriseId" INTEGER NOT NULL;

-- DropTable
DROP TABLE "EnterpriseDraft";

-- DropTable
DROP TABLE "EnterpriseDraftServiceArea";

-- DropTable
DROP TABLE "EnterpriseDraftWasteType";

-- DropTable
DROP TABLE "EnterpriseDraftWorkingHour";

-- CreateIndex
CREATE INDEX "Payment_enterpriseId_idx" ON "Payment"("enterpriseId");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_enterpriseId_fkey" FOREIGN KEY ("enterpriseId") REFERENCES "Enterprise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
