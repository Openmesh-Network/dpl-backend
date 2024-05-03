-- AlterTable
ALTER TABLE "openmeshTemplateData" ADD COLUMN     "source" TEXT DEFAULT 'openmesh',
ALTER COLUMN "techDiagrams" DROP NOT NULL;
