-- AlterTable
ALTER TABLE "User" ADD COLUMN     "country" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "fullName" TEXT,
ADD COLUMN     "religion" TEXT,
ADD COLUMN     "setupCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "therapyFocus" TEXT,
ADD COLUMN     "therapyType" TEXT;
