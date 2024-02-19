-- DropForeignKey
ALTER TABLE "pythiaInput" DROP CONSTRAINT "pythiaInput_pythiaChatId_fkey";

-- AddForeignKey
ALTER TABLE "pythiaInput" ADD CONSTRAINT "pythiaInput_pythiaChatId_fkey" FOREIGN KEY ("pythiaChatId") REFERENCES "pythiaChat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
