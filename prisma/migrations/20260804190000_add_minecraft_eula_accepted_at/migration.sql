-- Records when the customer accepted the Minecraft EULA at checkout.
ALTER TABLE "Order" ADD COLUMN "minecraftEulaAcceptedAt" TIMESTAMP(3);
