/*
  Warnings:

  - A unique constraint covering the columns `[web3Address]` on the table `openmeshExpertUser` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "openmeshExpertUser" ADD COLUMN     "web3Address" TEXT,
ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "password" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "openmeshExpertUser_web3Address_key" ON "openmeshExpertUser"("web3Address");
