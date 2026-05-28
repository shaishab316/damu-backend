-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "isPublic" BOOLEAN DEFAULT true,
ADD COLUMN     "isVerified" BOOLEAN DEFAULT false,
ADD COLUMN     "totalLike" INTEGER DEFAULT 0,
ADD COLUMN     "totalView" INTEGER DEFAULT 0;
