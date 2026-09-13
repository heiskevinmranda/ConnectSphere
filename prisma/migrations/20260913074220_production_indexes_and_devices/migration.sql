-- DropIndex
DROP INDEX "plans_slug_idx";

-- CreateTable
CREATE TABLE "network_devices" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'router',
    "model" TEXT,
    "ip" TEXT,
    "macAddress" TEXT,
    "serialNumber" TEXT,
    "location" TEXT,
    "firmware" TEXT,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "lastSeenAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "network_devices_macAddress_key" ON "network_devices"("macAddress");

-- CreateIndex
CREATE INDEX "network_devices_type_idx" ON "network_devices"("type");

-- CreateIndex
CREATE INDEX "audit_logs_adminId_idx" ON "audit_logs"("adminId");

-- CreateIndex
CREATE INDEX "payments_phoneNumber_status_idx" ON "payments"("phoneNumber", "status");

-- CreateIndex
CREATE INDEX "payments_azampayTransactionId_idx" ON "payments"("azampayTransactionId");

-- CreateIndex
CREATE INDEX "subscriptions_voucherCode_idx" ON "subscriptions"("voucherCode");

-- CreateIndex
CREATE INDEX "vouchers_createdAt_idx" ON "vouchers"("createdAt");

-- CreateIndex
CREATE INDEX "vouchers_price_isUsed_subscriptionId_idx" ON "vouchers"("price", "isUsed", "subscriptionId");
