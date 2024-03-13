-- CreateTable
CREATE TABLE "llmInstance" (
    "id" TEXT NOT NULL,
    "urlEndpoint" TEXT,
    "modelId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "llmInstance_pkey" PRIMARY KEY ("id")
);
