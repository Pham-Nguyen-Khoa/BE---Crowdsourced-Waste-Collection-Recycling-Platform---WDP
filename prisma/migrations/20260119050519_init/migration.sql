-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CITIZEN', 'ENTERPRISE', 'COLLECTOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'ACCEPTED', 'ASSIGNED', 'ON_THE_WAY', 'WAITING_CUSTOMER', 'COLLECTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "WasteType" AS ENUM ('ORGANIC', 'RECYCLABLE', 'HAZARDOUS');

-- CreateEnum
CREATE TYPE "AttemptResult" AS ENUM ('SUCCESS', 'CUSTOMER_ABSENT', 'FAILED');

-- CreateEnum
CREATE TYPE "CollectorAvailability" AS ENUM ('AVAILABLE', 'ON_TASK', 'OFFLINE');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('MONTHLY', 'HALF_YEAR', 'YEARLY');

-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('OPEN', 'RESOLVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('REPORT_ASSIGNED', 'REPORT_STATUS_CHANGED', 'CUSTOMER_NOT_FOUND', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'BANNED', 'DELETED');

-- CreateEnum
CREATE TYPE "EnterpriseStatus" AS ENUM ('ACTIVE', 'BANNED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Role" (
    "id" SERIAL NOT NULL,
    "name" "UserRole" NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleId" INTEGER NOT NULL,
    "permissionId" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "fullName" VARCHAR(255) NOT NULL,
    "avatar" VARCHAR(255),
    "phone" VARCHAR(20),
    "roleId" INTEGER NOT NULL,
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enterprise" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "status" "EnterpriseStatus" NOT NULL DEFAULT 'ACTIVE',
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "capacityKg" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Enterprise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnterpriseWorkingHour" (
    "enterpriseId" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,

    CONSTRAINT "EnterpriseWorkingHour_pkey" PRIMARY KEY ("enterpriseId")
);

-- CreateTable
CREATE TABLE "EnterpriseServiceArea" (
    "id" SERIAL NOT NULL,
    "enterpriseId" INTEGER NOT NULL,
    "provinceCode" TEXT NOT NULL,
    "districtCode" TEXT,
    "wardCode" TEXT,

    CONSTRAINT "EnterpriseServiceArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnterpriseWasteType" (
    "id" SERIAL NOT NULL,
    "enterpriseId" INTEGER NOT NULL,
    "wasteType" "WasteType" NOT NULL,

    CONSTRAINT "EnterpriseWasteType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnterpriseDraft" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "capacityKg" DECIMAL(10,2) NOT NULL,
    "subscriptionPlanConfigId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnterpriseDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnterpriseDraftWorkingHour" (
    "enterpriseDraftId" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,

    CONSTRAINT "EnterpriseDraftWorkingHour_pkey" PRIMARY KEY ("enterpriseDraftId")
);

-- CreateTable
CREATE TABLE "EnterpriseDraftServiceArea" (
    "id" SERIAL NOT NULL,
    "enterpriseDraftId" INTEGER NOT NULL,
    "provinceCode" TEXT NOT NULL,
    "districtCode" TEXT,
    "wardCode" TEXT,

    CONSTRAINT "EnterpriseDraftServiceArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnterpriseDraftWasteType" (
    "id" SERIAL NOT NULL,
    "enterpriseDraftId" INTEGER NOT NULL,
    "wasteType" "WasteType" NOT NULL,

    CONSTRAINT "EnterpriseDraftWasteType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "enterpriseDraftId" INTEGER NOT NULL,
    "subscriptionPlanConfigId" INTEGER NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'VND',
    "description" VARCHAR(255) NOT NULL,
    "referenceCode" VARCHAR(50) NOT NULL,
    "bankTransactionId" VARCHAR(100),
    "bankAccountNumber" VARCHAR(50),
    "bankName" VARCHAR(100),
    "notes" TEXT,
    "webhookId" VARCHAR(100),
    "webhookData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionPlanConfig" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "durationMonths" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPlanConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" SERIAL NOT NULL,
    "enterpriseId" INTEGER NOT NULL,
    "subscriptionPlanConfigId" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Collector" (
    "id" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "enterpriseId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Collector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectorStatus" (
    "collectorId" INTEGER NOT NULL,
    "status" "CollectorAvailability" NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectorStatus_pkey" PRIMARY KEY ("collectorId")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" SERIAL NOT NULL,
    "citizenId" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "provinceCode" VARCHAR(10) NOT NULL,
    "districtCode" VARCHAR(10) NOT NULL,
    "wardCode" VARCHAR(10) NOT NULL,
    "description" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportWaste" (
    "id" SERIAL NOT NULL,
    "reportId" INTEGER NOT NULL,
    "wasteType" "WasteType" NOT NULL,
    "weightKg" DECIMAL(8,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportWaste_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportImage" (
    "id" SERIAL NOT NULL,
    "reportId" INTEGER NOT NULL,
    "imageUrl" TEXT NOT NULL,

    CONSTRAINT "ReportImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportAssignment" (
    "id" SERIAL NOT NULL,
    "reportId" INTEGER NOT NULL,
    "enterpriseId" INTEGER NOT NULL,
    "collectorId" INTEGER,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ReportAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportAttempt" (
    "id" SERIAL NOT NULL,
    "reportId" INTEGER NOT NULL,
    "collectorId" INTEGER NOT NULL,
    "attemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "result" "AttemptResult" NOT NULL,
    "note" TEXT,

    CONSTRAINT "ReportAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportEvaluation" (
    "id" SERIAL NOT NULL,
    "reportId" INTEGER NOT NULL,
    "addressCorrect" BOOLEAN NOT NULL,
    "wasteAccuracy" INTEGER NOT NULL,
    "finalPoint" INTEGER NOT NULL,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportEvaluationImage" (
    "id" SERIAL NOT NULL,
    "evaluationId" INTEGER NOT NULL,
    "imageUrl" TEXT NOT NULL,

    CONSTRAINT "ReportEvaluationImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CitizenPointHistory" (
    "id" SERIAL NOT NULL,
    "citizenId" INTEGER NOT NULL,
    "reportId" INTEGER NOT NULL,
    "point" INTEGER NOT NULL,
    "reason" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CitizenPointHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Complaint" (
    "id" SERIAL NOT NULL,
    "reportId" INTEGER NOT NULL,
    "citizenId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "status" "ComplaintStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointConfig" (
    "id" SERIAL NOT NULL,
    "wasteType" "WasteType" NOT NULL,
    "basePoint" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PointConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectorPerformanceConfig" (
    "id" SERIAL NOT NULL,
    "maxTimeMinutes" INTEGER NOT NULL,
    "rewardPoint" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectorPerformanceConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordReset" (
    "id" SERIAL NOT NULL,
    "userID" INTEGER NOT NULL,
    "otpHash" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordReset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_code_key" ON "Permission"("code");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_phone_idx" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Enterprise_userId_key" ON "Enterprise"("userId");

-- CreateIndex
CREATE INDEX "Enterprise_name_idx" ON "Enterprise"("name");

-- CreateIndex
CREATE INDEX "Enterprise_status_idx" ON "Enterprise"("status");

-- CreateIndex
CREATE INDEX "Enterprise_latitude_longitude_idx" ON "Enterprise"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "Enterprise_deletedAt_idx" ON "Enterprise"("deletedAt");

-- CreateIndex
CREATE INDEX "EnterpriseServiceArea_provinceCode_districtCode_wardCode_idx" ON "EnterpriseServiceArea"("provinceCode", "districtCode", "wardCode");

-- CreateIndex
CREATE UNIQUE INDEX "EnterpriseWasteType_enterpriseId_wasteType_key" ON "EnterpriseWasteType"("enterpriseId", "wasteType");

-- CreateIndex
CREATE INDEX "EnterpriseDraft_userId_idx" ON "EnterpriseDraft"("userId");

-- CreateIndex
CREATE INDEX "EnterpriseDraft_subscriptionPlanConfigId_idx" ON "EnterpriseDraft"("subscriptionPlanConfigId");

-- CreateIndex
CREATE INDEX "EnterpriseDraftServiceArea_provinceCode_districtCode_wardCo_idx" ON "EnterpriseDraftServiceArea"("provinceCode", "districtCode", "wardCode");

-- CreateIndex
CREATE UNIQUE INDEX "EnterpriseDraftWasteType_enterpriseDraftId_wasteType_key" ON "EnterpriseDraftWasteType"("enterpriseDraftId", "wasteType");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_referenceCode_key" ON "Payment"("referenceCode");

-- CreateIndex
CREATE INDEX "Payment_userId_idx" ON "Payment"("userId");

-- CreateIndex
CREATE INDEX "Payment_enterpriseDraftId_idx" ON "Payment"("enterpriseDraftId");

-- CreateIndex
CREATE INDEX "Payment_subscriptionPlanConfigId_idx" ON "Payment"("subscriptionPlanConfigId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_referenceCode_idx" ON "Payment"("referenceCode");

-- CreateIndex
CREATE INDEX "Payment_webhookId_idx" ON "Payment"("webhookId");

-- CreateIndex
CREATE INDEX "Payment_expiresAt_idx" ON "Payment"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPlanConfig_name_key" ON "SubscriptionPlanConfig"("name");

-- CreateIndex
CREATE INDEX "SubscriptionPlanConfig_isActive_idx" ON "SubscriptionPlanConfig"("isActive");

-- CreateIndex
CREATE INDEX "SubscriptionPlanConfig_durationMonths_idx" ON "SubscriptionPlanConfig"("durationMonths");

-- CreateIndex
CREATE INDEX "Subscription_enterpriseId_idx" ON "Subscription"("enterpriseId");

-- CreateIndex
CREATE INDEX "Subscription_subscriptionPlanConfigId_idx" ON "Subscription"("subscriptionPlanConfigId");

-- CreateIndex
CREATE INDEX "Subscription_isActive_endDate_idx" ON "Subscription"("isActive", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "Collector_userId_key" ON "Collector"("userId");

-- CreateIndex
CREATE INDEX "Collector_enterpriseId_idx" ON "Collector"("enterpriseId");

-- CreateIndex
CREATE INDEX "Collector_deletedAt_idx" ON "Collector"("deletedAt");

-- CreateIndex
CREATE INDEX "Report_citizenId_idx" ON "Report"("citizenId");

-- CreateIndex
CREATE INDEX "Report_status_idx" ON "Report"("status");

-- CreateIndex
CREATE INDEX "Report_provinceCode_districtCode_wardCode_idx" ON "Report"("provinceCode", "districtCode", "wardCode");

-- CreateIndex
CREATE INDEX "Report_latitude_longitude_idx" ON "Report"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "Report_createdAt_idx" ON "Report"("createdAt");

-- CreateIndex
CREATE INDEX "Report_deletedAt_idx" ON "Report"("deletedAt");

-- CreateIndex
CREATE INDEX "ReportWaste_reportId_idx" ON "ReportWaste"("reportId");

-- CreateIndex
CREATE INDEX "ReportWaste_wasteType_idx" ON "ReportWaste"("wasteType");

-- CreateIndex
CREATE UNIQUE INDEX "ReportAssignment_reportId_key" ON "ReportAssignment"("reportId");

-- CreateIndex
CREATE INDEX "ReportAssignment_enterpriseId_idx" ON "ReportAssignment"("enterpriseId");

-- CreateIndex
CREATE INDEX "ReportAssignment_collectorId_idx" ON "ReportAssignment"("collectorId");

-- CreateIndex
CREATE INDEX "ReportAssignment_assignedAt_idx" ON "ReportAssignment"("assignedAt");

-- CreateIndex
CREATE INDEX "ReportAttempt_reportId_idx" ON "ReportAttempt"("reportId");

-- CreateIndex
CREATE INDEX "ReportAttempt_collectorId_idx" ON "ReportAttempt"("collectorId");

-- CreateIndex
CREATE INDEX "ReportAttempt_result_idx" ON "ReportAttempt"("result");

-- CreateIndex
CREATE INDEX "ReportAttempt_attemptAt_idx" ON "ReportAttempt"("attemptAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReportEvaluation_reportId_key" ON "ReportEvaluation"("reportId");

-- CreateIndex
CREATE INDEX "ReportEvaluation_reportId_idx" ON "ReportEvaluation"("reportId");

-- CreateIndex
CREATE INDEX "ReportEvaluation_wasteAccuracy_idx" ON "ReportEvaluation"("wasteAccuracy");

-- CreateIndex
CREATE INDEX "ReportEvaluation_finalPoint_idx" ON "ReportEvaluation"("finalPoint");

-- CreateIndex
CREATE INDEX "CitizenPointHistory_citizenId_idx" ON "CitizenPointHistory"("citizenId");

-- CreateIndex
CREATE INDEX "CitizenPointHistory_reportId_idx" ON "CitizenPointHistory"("reportId");

-- CreateIndex
CREATE INDEX "CitizenPointHistory_createdAt_idx" ON "CitizenPointHistory"("createdAt");

-- CreateIndex
CREATE INDEX "Complaint_reportId_idx" ON "Complaint"("reportId");

-- CreateIndex
CREATE INDEX "Complaint_citizenId_idx" ON "Complaint"("citizenId");

-- CreateIndex
CREATE INDEX "Complaint_status_idx" ON "Complaint"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PointConfig_wasteType_key" ON "PointConfig"("wasteType");

-- CreateIndex
CREATE INDEX "PointConfig_wasteType_idx" ON "PointConfig"("wasteType");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

-- CreateIndex
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "PasswordReset_userID_idx" ON "PasswordReset"("userID");

-- CreateIndex
CREATE INDEX "PasswordReset_createdAt_idx" ON "PasswordReset"("createdAt");

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enterprise" ADD CONSTRAINT "Enterprise_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseWorkingHour" ADD CONSTRAINT "EnterpriseWorkingHour_enterpriseId_fkey" FOREIGN KEY ("enterpriseId") REFERENCES "Enterprise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseServiceArea" ADD CONSTRAINT "EnterpriseServiceArea_enterpriseId_fkey" FOREIGN KEY ("enterpriseId") REFERENCES "Enterprise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseWasteType" ADD CONSTRAINT "EnterpriseWasteType_enterpriseId_fkey" FOREIGN KEY ("enterpriseId") REFERENCES "Enterprise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseDraft" ADD CONSTRAINT "EnterpriseDraft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseDraft" ADD CONSTRAINT "EnterpriseDraft_subscriptionPlanConfigId_fkey" FOREIGN KEY ("subscriptionPlanConfigId") REFERENCES "SubscriptionPlanConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseDraftWorkingHour" ADD CONSTRAINT "EnterpriseDraftWorkingHour_enterpriseDraftId_fkey" FOREIGN KEY ("enterpriseDraftId") REFERENCES "EnterpriseDraft"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseDraftServiceArea" ADD CONSTRAINT "EnterpriseDraftServiceArea_enterpriseDraftId_fkey" FOREIGN KEY ("enterpriseDraftId") REFERENCES "EnterpriseDraft"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseDraftWasteType" ADD CONSTRAINT "EnterpriseDraftWasteType_enterpriseDraftId_fkey" FOREIGN KEY ("enterpriseDraftId") REFERENCES "EnterpriseDraft"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_enterpriseDraftId_fkey" FOREIGN KEY ("enterpriseDraftId") REFERENCES "EnterpriseDraft"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_subscriptionPlanConfigId_fkey" FOREIGN KEY ("subscriptionPlanConfigId") REFERENCES "SubscriptionPlanConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_enterpriseId_fkey" FOREIGN KEY ("enterpriseId") REFERENCES "Enterprise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_subscriptionPlanConfigId_fkey" FOREIGN KEY ("subscriptionPlanConfigId") REFERENCES "SubscriptionPlanConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collector" ADD CONSTRAINT "Collector_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collector" ADD CONSTRAINT "Collector_enterpriseId_fkey" FOREIGN KEY ("enterpriseId") REFERENCES "Enterprise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectorStatus" ADD CONSTRAINT "CollectorStatus_collectorId_fkey" FOREIGN KEY ("collectorId") REFERENCES "Collector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportWaste" ADD CONSTRAINT "ReportWaste_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportImage" ADD CONSTRAINT "ReportImage_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportAssignment" ADD CONSTRAINT "ReportAssignment_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportAssignment" ADD CONSTRAINT "ReportAssignment_enterpriseId_fkey" FOREIGN KEY ("enterpriseId") REFERENCES "Enterprise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportAssignment" ADD CONSTRAINT "ReportAssignment_collectorId_fkey" FOREIGN KEY ("collectorId") REFERENCES "Collector"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportAttempt" ADD CONSTRAINT "ReportAttempt_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportAttempt" ADD CONSTRAINT "ReportAttempt_collectorId_fkey" FOREIGN KEY ("collectorId") REFERENCES "Collector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportEvaluation" ADD CONSTRAINT "ReportEvaluation_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportEvaluationImage" ADD CONSTRAINT "ReportEvaluationImage_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "ReportEvaluation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CitizenPointHistory" ADD CONSTRAINT "CitizenPointHistory_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CitizenPointHistory" ADD CONSTRAINT "CitizenPointHistory_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordReset" ADD CONSTRAINT "PasswordReset_userID_fkey" FOREIGN KEY ("userID") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
