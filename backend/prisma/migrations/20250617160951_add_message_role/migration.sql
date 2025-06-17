/*
  Warnings:

  - Added the required column `role` to the `Message` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('USER', 'ASSISTANT');

-- AlterTable
ALTER TABLE "Message" ADD COLUMN "role" "MessageRole";

-- Update existing messages to have USER role
UPDATE "Message" SET "role" = 'USER' WHERE "role" IS NULL;

-- Make role column required
ALTER TABLE "Message" ALTER COLUMN "role" SET NOT NULL;
