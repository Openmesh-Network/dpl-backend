-- AlterTable
ALTER TABLE "openmeshTemplateData" ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "templateDataProduct" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "openmeshTemplateDataId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "templateDataProduct_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "templateDataProduct" ADD CONSTRAINT "templateDataProduct_openmeshTemplateDataId_fkey" FOREIGN KEY ("openmeshTemplateDataId") REFERENCES "openmeshTemplateData"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
