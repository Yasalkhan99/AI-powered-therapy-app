-- AlterTable
ALTER TABLE "VoiceSessionSetup" ADD COLUMN     "autoStart" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "voiceAccent" TEXT,
ADD COLUMN     "voiceGender" TEXT,
ADD COLUMN     "voiceId" TEXT,
ADD COLUMN     "voiceName" TEXT;
