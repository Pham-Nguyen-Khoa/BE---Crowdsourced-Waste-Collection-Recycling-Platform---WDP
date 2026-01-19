-- DropForeignKey
ALTER TABLE "EnterpriseDraftServiceArea" DROP CONSTRAINT "EnterpriseDraftServiceArea_enterpriseDraftId_fkey";

-- DropForeignKey
ALTER TABLE "EnterpriseDraftWasteType" DROP CONSTRAINT "EnterpriseDraftWasteType_enterpriseDraftId_fkey";

-- DropForeignKey
ALTER TABLE "EnterpriseDraftWorkingHour" DROP CONSTRAINT "EnterpriseDraftWorkingHour_enterpriseDraftId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_enterpriseDraftId_fkey";

-- AddForeignKey
ALTER TABLE "EnterpriseDraftWorkingHour" ADD CONSTRAINT "EnterpriseDraftWorkingHour_enterpriseDraftId_fkey" FOREIGN KEY ("enterpriseDraftId") REFERENCES "EnterpriseDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseDraftServiceArea" ADD CONSTRAINT "EnterpriseDraftServiceArea_enterpriseDraftId_fkey" FOREIGN KEY ("enterpriseDraftId") REFERENCES "EnterpriseDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseDraftWasteType" ADD CONSTRAINT "EnterpriseDraftWasteType_enterpriseDraftId_fkey" FOREIGN KEY ("enterpriseDraftId") REFERENCES "EnterpriseDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_enterpriseDraftId_fkey" FOREIGN KEY ("enterpriseDraftId") REFERENCES "EnterpriseDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;
