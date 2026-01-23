/*
  Warnings:

  - You are about to drop the `EnterpriseWorkingHour` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "EnterpriseWorkingHour" DROP CONSTRAINT "EnterpriseWorkingHour_enterpriseId_fkey";

-- DropTable
DROP TABLE "EnterpriseWorkingHour";
