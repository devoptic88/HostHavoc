ALTER TYPE "OrderStatus" ADD VALUE 'GRACE_PERIOD';

ALTER TABLE "Order"
ADD COLUMN "rustAllocations" JSONB,
ADD COLUMN "deleteAfterAt" TIMESTAMP(3);

CREATE INDEX "Order_deleteAfterAt_idx" ON "Order"("deleteAfterAt");

CREATE TABLE "RustNodeConfig" (
    "id" TEXT NOT NULL,
    "nodeId" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "allocationIp" TEXT NOT NULL,
    "allocationAlias" TEXT,
    "portRanges" TEXT NOT NULL,
    "portStride" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RustNodeConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RustNodeConfig_nodeId_key" ON "RustNodeConfig"("nodeId");
