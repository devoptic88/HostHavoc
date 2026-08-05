-- Per-server DNS label under SERVER_DOMAIN (e.g. "survival" -> survival.hypernode.gg).
ALTER TABLE "Order" ADD COLUMN "subdomain" TEXT;
CREATE UNIQUE INDEX "Order_subdomain_key" ON "Order"("subdomain");
