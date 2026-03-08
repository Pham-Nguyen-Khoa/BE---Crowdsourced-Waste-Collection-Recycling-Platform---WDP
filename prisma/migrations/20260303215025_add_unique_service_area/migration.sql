/*
  Warnings:

  - A unique constraint covering the columns `[enterpriseId,provinceCode,districtCode,wardCode]` on the table `EnterpriseServiceArea` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "EnterpriseServiceArea_enterpriseId_provinceCode_districtCod_key" ON "EnterpriseServiceArea"("enterpriseId", "provinceCode", "districtCode", "wardCode");
