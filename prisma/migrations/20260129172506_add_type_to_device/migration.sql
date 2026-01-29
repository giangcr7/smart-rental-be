/*
  Warnings:

  - The values [CARD,PASSWORD] on the enum `AccessMethod` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `checkInAt` on the `AccessLog` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `Device` table. All the data in the column will be lost.
  - Added the required column `type` to the `Device` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Device` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AccessMethod_new" AS ENUM ('FINGERPRINT', 'FACE_ID', 'PASSCODE', 'RFID');
ALTER TABLE "AccessLog" ALTER COLUMN "method" DROP DEFAULT;
ALTER TABLE "AccessLog" ALTER COLUMN "method" TYPE "AccessMethod_new" USING ("method"::text::"AccessMethod_new");
ALTER TYPE "AccessMethod" RENAME TO "AccessMethod_old";
ALTER TYPE "AccessMethod_new" RENAME TO "AccessMethod";
DROP TYPE "AccessMethod_old";
ALTER TABLE "AccessLog" ALTER COLUMN "method" SET DEFAULT 'FINGERPRINT';
COMMIT;

-- AlterEnum
ALTER TYPE "AccessStatus" ADD VALUE 'DENIED';

-- DropForeignKey
ALTER TABLE "AccessLog" DROP CONSTRAINT "AccessLog_userId_fkey";

-- AlterTable
ALTER TABLE "AccessLog" DROP COLUMN "checkInAt",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Device" DROP COLUMN "isActive",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "type" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "AccessLog_userId_idx" ON "AccessLog"("userId");

-- CreateIndex
CREATE INDEX "AccessLog_createdAt_idx" ON "AccessLog"("createdAt");

-- AddForeignKey
ALTER TABLE "AccessLog" ADD CONSTRAINT "AccessLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
