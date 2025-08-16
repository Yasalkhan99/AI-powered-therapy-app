-- AlterTable
ALTER TABLE "VoiceSessionSetup" ADD COLUMN     "actualDuration" INTEGER,
ADD COLUMN     "sessionEndedAt" TIMESTAMP(3),
ADD COLUMN     "sessionStartedAt" TIMESTAMP(3);
