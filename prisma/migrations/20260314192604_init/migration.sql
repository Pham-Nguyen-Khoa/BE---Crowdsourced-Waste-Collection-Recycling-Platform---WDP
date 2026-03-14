-- AlterTable
ALTER TABLE "Complaint" ADD COLUMN     "evidenceImages" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "UserPoint" (
    "userId" INTEGER NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPoint_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "ReportFakeLog" (
    "id" SERIAL NOT NULL,
    "reportId" INTEGER NOT NULL,
    "reporterId" INTEGER NOT NULL,
    "violatorId" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportFakeLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "UserPoint" ADD CONSTRAINT "UserPoint_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportFakeLog" ADD CONSTRAINT "ReportFakeLog_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportFakeLog" ADD CONSTRAINT "ReportFakeLog_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportFakeLog" ADD CONSTRAINT "ReportFakeLog_violatorId_fkey" FOREIGN KEY ("violatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
