-- CreateTable
CREATE TABLE "openmeshTemplateData" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "tags" TEXT[],
    "systemMinRequirements" TEXT,
    "systemRecommendedRequirements" TEXT,
    "productsIncluded" TEXT[],
    "techDiagrams" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "openmeshTemplateData_pkey" PRIMARY KEY ("id")
);
