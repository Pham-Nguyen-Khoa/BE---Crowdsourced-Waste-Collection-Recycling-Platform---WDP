/*
  Warnings:

  - You are about to drop the `ReportRejectedEnterprise` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('WAITING', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- DropForeignKey
ALTER TABLE "ReportRejectedEnterprise" DROP CONSTRAINT "ReportRejectedEnterprise_enterpriseId_fkey";

-- DropForeignKey
ALTER TABLE "ReportRejectedEnterprise" DROP CONSTRAINT "ReportRejectedEnterprise_reportId_fkey";

-- DropTable
DROP TABLE "ReportRejectedEnterprise";

-- CreateTable
CREATE TABLE "ReportEnterpriseAttempt" (
    "id" SERIAL NOT NULL,
    "reportId" INTEGER NOT NULL,
    "enterpriseId" INTEGER NOT NULL,
    "priorityOrder" INTEGER NOT NULL,
    "status" "AttemptStatus" NOT NULL DEFAULT 'WAITING',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportEnterpriseAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReportEnterpriseAttempt_reportId_priorityOrder_idx" ON "ReportEnterpriseAttempt"("reportId", "priorityOrder");

-- CreateIndex
CREATE INDEX "ReportEnterpriseAttempt_status_sentAt_idx" ON "ReportEnterpriseAttempt"("status", "sentAt");

-- CreateIndex
CREATE INDEX "ReportEnterpriseAttempt_sentAt_idx" ON "ReportEnterpriseAttempt"("sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReportEnterpriseAttempt_reportId_enterpriseId_key" ON "ReportEnterpriseAttempt"("reportId", "enterpriseId");

-- AddForeignKey
ALTER TABLE "ReportEnterpriseAttempt" ADD CONSTRAINT "ReportEnterpriseAttempt_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportEnterpriseAttempt" ADD CONSTRAINT "ReportEnterpriseAttempt_enterpriseId_fkey" FOREIGN KEY ("enterpriseId") REFERENCES "Enterprise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
