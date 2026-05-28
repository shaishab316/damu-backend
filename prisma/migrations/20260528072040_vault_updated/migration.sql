/*
  Warnings:

  - You are about to drop the column `deviceInfoId` on the `Auth` table. All the data in the column will be lost.
  - You are about to drop the column `lastLogin` on the `Auth` table. All the data in the column will be lost.
  - You are about to drop the column `deviceName` on the `DeviceSession` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Auth" DROP CONSTRAINT "Auth_deviceInfoId_fkey";

-- AlterTable
ALTER TABLE "Auth" DROP COLUMN "deviceInfoId",
DROP COLUMN "lastLogin";

-- AlterTable
ALTER TABLE "DeviceSession" DROP COLUMN "deviceName",
ADD COLUMN     "deviceNameId" TEXT;

-- AddForeignKey
ALTER TABLE "DeviceSession" ADD CONSTRAINT "DeviceSession_deviceNameId_fkey" FOREIGN KEY ("deviceNameId") REFERENCES "Vault"("id") ON DELETE SET NULL ON UPDATE CASCADE;
