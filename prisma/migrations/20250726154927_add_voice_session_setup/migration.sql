-- CreateTable
CREATE TABLE "VoiceSessionSetup" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "therapistId" TEXT NOT NULL,
    "therapistName" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "supportType" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoiceSessionSetup_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "VoiceSessionSetup" ADD CONSTRAINT "VoiceSessionSetup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
