-- AlterTable
ALTER TABLE "Branch" ADD COLUMN     "image" TEXT;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "paymentProof" TEXT;

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "image" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatar" TEXT;
