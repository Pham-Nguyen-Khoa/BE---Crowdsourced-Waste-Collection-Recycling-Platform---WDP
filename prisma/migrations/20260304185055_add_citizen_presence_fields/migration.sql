/*
  Warnings:

  - You are about to drop the column `citizenArrivalConfirmed` on the `Report` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Report" DROP COLUMN "citizenArrivalConfirmed",
ADD COLUMN     "citizenAbsentAt" TIMESTAMP(3);
