/*
  Warnings:

  - You are about to drop the column `validationCloudAPIKey` on the `openmeshExpertUser` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "openmeshExpertUser" DROP COLUMN "validationCloudAPIKey",
ADD COLUMN     "validationCloudAPIKeyEthereum" TEXT,
ADD COLUMN     "validationCloudAPIKeyPolygon" TEXT;
