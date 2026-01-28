-- AlterEnum
ALTER TYPE "ReportStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "cancelReason" TEXT;
