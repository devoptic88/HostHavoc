-- DropIndex
DROP INDEX "Order_stripeSubscriptionId_key";

-- DropIndex
DROP INDEX "Plan_stripePriceId_key";

-- DropIndex
DROP INDEX "User_stripeCustomerId_key";

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "stripeSubscriptionId",
ADD COLUMN     "paymenterOrderId" INTEGER;

-- AlterTable
ALTER TABLE "Plan" DROP COLUMN "stripePriceId",
ADD COLUMN     "paymenterProductId" INTEGER;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "stripeCustomerId",
ADD COLUMN     "paymenterUserId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Order_paymenterOrderId_key" ON "Order"("paymenterOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_paymenterProductId_key" ON "Plan"("paymenterProductId");

-- CreateIndex
CREATE UNIQUE INDEX "User_paymenterUserId_key" ON "User"("paymenterUserId");
