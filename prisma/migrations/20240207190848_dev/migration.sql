-- CreateTable
CREATE TABLE "pythiaChat" (
    "id" TEXT NOT NULL,
    "wallet" TEXT,
    "amount" TEXT,
    "txStatus" TEXT,
    "isClaimed" BOOLEAN NOT NULL DEFAULT false,
    "openmeshExpertUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "pythiaChat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pythiaInput" (
    "id" TEXT NOT NULL,
    "userMessage" TEXT,
    "response" TEXT,
    "pythiaChatId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "pythiaInput_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "pythiaChat" ADD CONSTRAINT "pythiaChat_openmeshExpertUserId_fkey" FOREIGN KEY ("openmeshExpertUserId") REFERENCES "openmeshExpertUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pythiaInput" ADD CONSTRAINT "pythiaInput_pythiaChatId_fkey" FOREIGN KEY ("pythiaChatId") REFERENCES "pythiaChat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
