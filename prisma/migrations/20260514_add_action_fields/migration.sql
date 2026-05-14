-- AlterTable: Add actionUrl and actionType fields to Submission
ALTER TABLE "Submission" ADD COLUMN "actionUrl" TEXT;
ALTER TABLE "Submission" ADD COLUMN "actionType" TEXT;
