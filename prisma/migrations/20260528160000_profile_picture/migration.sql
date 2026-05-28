/*
  Warnings:

  - A unique constraint covering the columns `[profilePictureId]` on the table `Media` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Media" ADD COLUMN     "profileBannerId" TEXT,
ADD COLUMN     "profilePictureId" TEXT;

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "mediaId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Media_profilePictureId_key" ON "Media"("profilePictureId");

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_profilePictureId_fkey" FOREIGN KEY ("profilePictureId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_profileBannerId_fkey" FOREIGN KEY ("profileBannerId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
