-- DropForeignKey
ALTER TABLE "EnterpriseServiceArea" DROP CONSTRAINT "EnterpriseServiceArea_enterpriseId_fkey";

-- DropForeignKey
ALTER TABLE "EnterpriseWasteType" DROP CONSTRAINT "EnterpriseWasteType_enterpriseId_fkey";

-- DropForeignKey
ALTER TABLE "EnterpriseWorkingHour" DROP CONSTRAINT "EnterpriseWorkingHour_enterpriseId_fkey";

-- AddForeignKey
ALTER TABLE "EnterpriseWorkingHour" ADD CONSTRAINT "EnterpriseWorkingHour_enterpriseId_fkey" FOREIGN KEY ("enterpriseId") REFERENCES "Enterprise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseServiceArea" ADD CONSTRAINT "EnterpriseServiceArea_enterpriseId_fkey" FOREIGN KEY ("enterpriseId") REFERENCES "Enterprise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseWasteType" ADD CONSTRAINT "EnterpriseWasteType_enterpriseId_fkey" FOREIGN KEY ("enterpriseId") REFERENCES "Enterprise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
