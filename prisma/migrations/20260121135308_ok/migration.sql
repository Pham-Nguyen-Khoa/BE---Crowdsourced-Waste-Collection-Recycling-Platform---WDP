/*
  Warnings:

  - You are about to drop the `ReportAttempt` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ReportAttempt" DROP CONSTRAINT "ReportAttempt_collectorId_fkey";

-- DropForeignKey
ALTER TABLE "ReportAttempt" DROP CONSTRAINT "ReportAttempt_reportId_fkey";

-- DropTable
DROP TABLE "ReportAttempt";

-- CreateTable
CREATE TABLE "ReportRejectedEnterprise" (
    "id" SERIAL NOT NULL,
    "reportId" INTEGER NOT NULL,
    "enterpriseId" INTEGER NOT NULL,
    "rejectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportRejectedEnterprise_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReportRejectedEnterprise_reportId_idx" ON "ReportRejectedEnterprise"("reportId");

-- CreateIndex
CREATE UNIQUE INDEX "ReportRejectedEnterprise_reportId_enterpriseId_key" ON "ReportRejectedEnterprise"("reportId", "enterpriseId");

-- AddForeignKey
ALTER TABLE "ReportRejectedEnterprise" ADD CONSTRAINT "ReportRejectedEnterprise_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportRejectedEnterprise" ADD CONSTRAINT "ReportRejectedEnterprise_enterpriseId_fkey" FOREIGN KEY ("enterpriseId") REFERENCES "Enterprise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
