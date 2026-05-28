/*
  Warnings:

  - The `deviceType` column on the `DeviceSession` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('WEB', 'MOBILE', 'TABLET', 'DESKTOP', 'WINDOWS', 'MACOS', 'LINUX');

-- AlterTable
ALTER TABLE "DeviceSession" DROP COLUMN "deviceType",
ADD COLUMN     "deviceType" "DeviceType" NOT NULL DEFAULT 'WEB';
