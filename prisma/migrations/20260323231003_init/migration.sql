/*
  Warnings:

  - The values [RESOLVED] on the enum `ComplaintStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [REFUND] on the enum `PointTransactionType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `UserPoint` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "GiftType" AS ENUM ('FOOD', 'SHOPPING', 'OTHER');

-- CreateEnum
CREATE TYPE "ComplaintType" AS ENUM ('ATTITUDE', 'WEIGHT_MISMATCH', 'UNAUTHORIZED_FEE', 'NO_SHOW', 'OTHER');

-- AlterEnum
ALTER TYPE "CollectorTaskStatus" ADD VALUE 'CANCELLED';

-- AlterEnum
BEGIN;
CREATE TYPE "ComplaintStatus_new" AS ENUM ('OPEN', 'PROCESSED', 'REJECTED');
ALTER TABLE "public"."Complaint" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Complaint" ALTER COLUMN "status" TYPE "ComplaintStatus_new" USING ("status"::text::"ComplaintStatus_new");
ALTER TYPE "ComplaintStatus" RENAME TO "ComplaintStatus_old";
ALTER TYPE "ComplaintStatus_new" RENAME TO "ComplaintStatus";
DROP TYPE "public"."ComplaintStatus_old";
ALTER TABLE "Complaint" ALTER COLUMN "status" SET DEFAULT 'OPEN';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "PointTransactionType_new" AS ENUM ('EARN', 'SPEND', 'COMPENSATION');
ALTER TABLE "public"."PointTransaction" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "PointTransaction" ALTER COLUMN "type" TYPE "PointTransactionType_new" USING ("type"::text::"PointTransactionType_new");
ALTER TYPE "PointTransactionType" RENAME TO "PointTransactionType_old";
ALTER TYPE "PointTransactionType_new" RENAME TO "PointTransactionType";
DROP TYPE "public"."PointTransactionType_old";
ALTER TABLE "PointTransaction" ALTER COLUMN "type" SET DEFAULT 'EARN';
COMMIT;

-- DropForeignKey
ALTER TABLE "UserPoint" DROP CONSTRAINT "UserPoint_userId_fkey";

-- AlterTable
ALTER TABLE "Complaint" ADD COLUMN     "type" "ComplaintType" NOT NULL DEFAULT 'OTHER';

-- AlterTable
ALTER TABLE "Gift" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "type" "GiftType" NOT NULL DEFAULT 'SHOPPING';

-- DropTable
DROP TABLE "UserPoint";

-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "citizenBasePoint" INTEGER NOT NULL DEFAULT 100,
    "organicMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "recyclableMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.2,
    "hazardousMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.5,
    "accuracyMatchMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "accuracyModerateMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "accuracyHeavyMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 0.3,
    "collectorMatchTrustScore" INTEGER NOT NULL DEFAULT 2,
    "penaltyWeightMismatch" INTEGER NOT NULL DEFAULT 20,
    "penaltyUnauthorizedFee" INTEGER NOT NULL DEFAULT 30,
    "penaltyNoShow" INTEGER NOT NULL DEFAULT 15,
    "penaltyDefault" INTEGER NOT NULL DEFAULT 10,
    "citizenCompensation" INTEGER NOT NULL DEFAULT 50,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);
