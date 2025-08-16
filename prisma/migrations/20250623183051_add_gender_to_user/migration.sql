/*
  Warnings:

  - You are about to drop the column `onboardingCompleted` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "onboardingCompleted",
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "resetToken" VARCHAR(255),
ADD COLUMN     "resetTokenExpiry" TIMESTAMP(3);
