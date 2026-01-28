-- CreateTable
CREATE TABLE "DispatchLog" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "meta" JSONB,

    CONSTRAINT "DispatchLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DispatchLog_createdAt_idx" ON "DispatchLog"("createdAt");

-- CreateIndex
CREATE INDEX "DispatchLog_level_idx" ON "DispatchLog"("level");
