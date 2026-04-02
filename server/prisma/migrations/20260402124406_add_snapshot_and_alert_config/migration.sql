-- CreateTable
CREATE TABLE "UserAlertConfig" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "enableAnomalyAlerts" BOOLEAN NOT NULL DEFAULT true,
    "enableDailyDigest" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "UserAlertConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserAlertConfig_userId_key" ON "UserAlertConfig"("userId");

-- AddForeignKey
ALTER TABLE "UserAlertConfig" ADD CONSTRAINT "UserAlertConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
