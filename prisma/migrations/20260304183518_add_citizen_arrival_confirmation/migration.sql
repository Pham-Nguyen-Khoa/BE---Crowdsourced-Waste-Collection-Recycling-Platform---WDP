-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "citizenArrivalConfirmed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "citizenConfirmedAt" TIMESTAMP(3);
