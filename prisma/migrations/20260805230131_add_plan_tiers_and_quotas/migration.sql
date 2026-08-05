-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('PRO', 'LITE');

-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'HIBERNATING';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "backupBytes" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN     "hibernatedAt" TIMESTAMP(3),
ADD COLUMN     "hibernationArchiveUrl" TEXT;

-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "backupStorageMb" INTEGER NOT NULL DEFAULT 20480,
ADD COLUMN     "deploySlots" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "saveSlots" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "tier" "PlanTier" NOT NULL DEFAULT 'PRO';
