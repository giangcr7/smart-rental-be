-- CreateEnum
CREATE TYPE "AccessStatus" AS ENUM ('SUCCESS', 'FAILED');

-- AlterTable
ALTER TABLE "AccessLog" ADD COLUMN     "status" "AccessStatus" NOT NULL DEFAULT 'SUCCESS';
