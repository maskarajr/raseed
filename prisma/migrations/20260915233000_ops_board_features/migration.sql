-- AlterTable
ALTER TABLE "User" ADD COLUMN "phone" TEXT;
ALTER TABLE "User" ADD COLUMN "route" TEXT;

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN "route" TEXT;
ALTER TABLE "Customer" ADD COLUMN "bookerId" TEXT;
ALTER TABLE "Customer" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "advance" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'part';

-- CreateTable
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL
);
