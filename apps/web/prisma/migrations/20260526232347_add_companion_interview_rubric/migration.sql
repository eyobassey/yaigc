-- CreateEnum
CREATE TYPE "InterviewKind" AS ENUM ('phone_screen', 'in_person', 'final');

-- CreateEnum
CREATE TYPE "InterviewRecommendation" AS ENUM ('proceed', 'second_interview', 'decline', 'accept');

-- CreateEnum
CREATE TYPE "RubricBand" AS ENUM ('strong', 'present', 'unclear', 'absent');

-- CreateEnum
CREATE TYPE "UkSettledness" AS ENUM ('unclear', 'five_plus', 'three_to_five', 'under_three', 'n_a');

-- CreateEnum
CREATE TYPE "MotivationBand" AS ENUM ('clear', 'mixed', 'primarily_financial');

-- CreateEnum
CREATE TYPE "VettingState" AS ENUM ('yes', 'no', 'unknown', 'not_taken_yet');

-- CreateEnum
CREATE TYPE "ComfortBand" AS ENUM ('yes', 'concerns', 'no');

-- AlterTable
ALTER TABLE "CompanionApplication" ADD COLUMN     "experienceAlongside" TEXT,
ADD COLUMN     "motivation" TEXT,
ADD COLUMN     "weeklyStabilityNote" TEXT,
ADD COLUMN     "yearsSettledLocally" TEXT;

-- CreateTable
CREATE TABLE "CompanionInterview" (
    "id" TEXT NOT NULL,
    "companionApplicationId" TEXT NOT NULL,
    "kind" "InterviewKind" NOT NULL,
    "happenedAt" TIMESTAMP(3) NOT NULL,
    "interviewerOperatorId" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "recommendation" "InterviewRecommendation" NOT NULL,
    "ukSettledness" "UkSettledness",
    "communityTemperament" "RubricBand",
    "readsARoom" "RubricBand",
    "schedulingStability" "RubricBand",
    "motivationBeyondIncome" "MotivationBand",
    "dbsClearable" "VettingState",
    "referencesPositive" "VettingState",
    "engagementTermsComfort" "ComfortBand",
    "trainingAcceptance" "ComfortBand",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanionInterview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompanionInterview_companionApplicationId_happenedAt_idx" ON "CompanionInterview"("companionApplicationId", "happenedAt" DESC);

-- CreateIndex
CREATE INDEX "CompanionInterview_interviewerOperatorId_happenedAt_idx" ON "CompanionInterview"("interviewerOperatorId", "happenedAt" DESC);

-- AddForeignKey
ALTER TABLE "CompanionInterview" ADD CONSTRAINT "CompanionInterview_companionApplicationId_fkey" FOREIGN KEY ("companionApplicationId") REFERENCES "CompanionApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanionInterview" ADD CONSTRAINT "CompanionInterview_interviewerOperatorId_fkey" FOREIGN KEY ("interviewerOperatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
