-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "streamerMode" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "timezone" TEXT,
ADD COLUMN     "webRedirect" BOOLEAN NOT NULL DEFAULT false;
