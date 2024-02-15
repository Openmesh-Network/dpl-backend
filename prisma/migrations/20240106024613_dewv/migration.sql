-- AlterTable
ALTER TABLE "openmeshExpertUser" ADD COLUMN     "registrationByVerifiedContributor" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "walletAddress" TEXT;
