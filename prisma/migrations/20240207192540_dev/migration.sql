/*
  Warnings:

  - You are about to drop the column `amount` on the `pythiaChat` table. All the data in the column will be lost.
  - You are about to drop the column `isClaimed` on the `pythiaChat` table. All the data in the column will be lost.
  - You are about to drop the column `txStatus` on the `pythiaChat` table. All the data in the column will be lost.
  - You are about to drop the column `wallet` on the `pythiaChat` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "pythiaChat" DROP COLUMN "amount",
DROP COLUMN "isClaimed",
DROP COLUMN "txStatus",
DROP COLUMN "wallet";
