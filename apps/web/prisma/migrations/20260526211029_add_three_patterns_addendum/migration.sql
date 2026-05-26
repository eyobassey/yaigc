-- CreateEnum
CREATE TYPE "TwoVisitReviewOutcome" AS ENUM ('continue', 'adjust', 'reset');

-- DropForeignKey
ALTER TABLE "Authenticator" DROP CONSTRAINT "Authenticator_userId_fkey";

-- DropForeignKey
ALTER TABLE "CompanionBadge" DROP CONSTRAINT "CompanionBadge_awardedByOperatorId_fkey";

-- DropForeignKey
ALTER TABLE "CompanionBadge" DROP CONSTRAINT "CompanionBadge_companionId_fkey";

-- DropForeignKey
ALTER TABLE "FamilyTextRevision" DROP CONSTRAINT "FamilyTextRevision_authorUserId_fkey";

-- DropForeignKey
ALTER TABLE "FamilyTextRevision" DROP CONSTRAINT "FamilyTextRevision_familyId_fkey";

-- DropForeignKey
ALTER TABLE "FamilyTextRevision" DROP CONSTRAINT "FamilyTextRevision_recipientId_fkey";

-- DropForeignKey
ALTER TABLE "Match" DROP CONSTRAINT "Match_recipientId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_deletedByUserId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_senderId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_threadId_fkey";

-- DropForeignKey
ALTER TABLE "MessageAttachment" DROP CONSTRAINT "MessageAttachment_messageId_fkey";

-- DropForeignKey
ALTER TABLE "MessageAttachment" DROP CONSTRAINT "MessageAttachment_threadId_fkey";

-- DropForeignKey
ALTER TABLE "MessageAttachment" DROP CONSTRAINT "MessageAttachment_uploadedById_fkey";

-- DropForeignKey
ALTER TABLE "RelationshipNote" DROP CONSTRAINT "RelationshipNote_familyId_fkey";

-- DropForeignKey
ALTER TABLE "RelationshipNote" DROP CONSTRAINT "RelationshipNote_operatorUserId_fkey";

-- DropForeignKey
ALTER TABLE "Thread" DROP CONSTRAINT "Thread_companionUserId_fkey";

-- DropForeignKey
ALTER TABLE "Thread" DROP CONSTRAINT "Thread_familyUserId_fkey";

-- DropForeignKey
ALTER TABLE "Thread" DROP CONSTRAINT "Thread_operatorId_fkey";

-- DropForeignKey
ALTER TABLE "Thread" DROP CONSTRAINT "Thread_partyId_fkey";

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "coverCompanionId" TEXT,
ADD COLUMN     "coverIntroductionVisitsCompleted" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "twoVisitReviewByOperatorId" TEXT,
ADD COLUMN     "twoVisitReviewCompletedAt" TIMESTAMP(3),
ADD COLUMN     "twoVisitReviewNotes" TEXT,
ADD COLUMN     "twoVisitReviewOutcome" "TwoVisitReviewOutcome",
ADD COLUMN     "twoVisitReviewScheduledFor" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Visit" ADD COLUMN     "secondaryCompanionId" TEXT;

-- CreateIndex
CREATE INDEX "Match_coverCompanionId_status_idx" ON "Match"("coverCompanionId", "status");

-- CreateIndex
CREATE INDEX "Match_twoVisitReviewScheduledFor_twoVisitReviewCompletedAt_idx" ON "Match"("twoVisitReviewScheduledFor", "twoVisitReviewCompletedAt");

-- CreateIndex
CREATE INDEX "Visit_secondaryCompanionId_scheduledStartAt_idx" ON "Visit"("secondaryCompanionId", "scheduledStartAt");

-- AddForeignKey
ALTER TABLE "Authenticator" ADD CONSTRAINT "Authenticator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "Recipient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_coverCompanionId_fkey" FOREIGN KEY ("coverCompanionId") REFERENCES "Companion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_twoVisitReviewByOperatorId_fkey" FOREIGN KEY ("twoVisitReviewByOperatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_secondaryCompanionId_fkey" FOREIGN KEY ("secondaryCompanionId") REFERENCES "Companion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Thread" ADD CONSTRAINT "Thread_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Thread" ADD CONSTRAINT "Thread_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Thread" ADD CONSTRAINT "Thread_familyUserId_fkey" FOREIGN KEY ("familyUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Thread" ADD CONSTRAINT "Thread_companionUserId_fkey" FOREIGN KEY ("companionUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_deletedByUserId_fkey" FOREIGN KEY ("deletedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageAttachment" ADD CONSTRAINT "MessageAttachment_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageAttachment" ADD CONSTRAINT "MessageAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageAttachment" ADD CONSTRAINT "MessageAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanionBadge" ADD CONSTRAINT "CompanionBadge_companionId_fkey" FOREIGN KEY ("companionId") REFERENCES "Companion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanionBadge" ADD CONSTRAINT "CompanionBadge_awardedByOperatorId_fkey" FOREIGN KEY ("awardedByOperatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyTextRevision" ADD CONSTRAINT "FamilyTextRevision_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyTextRevision" ADD CONSTRAINT "FamilyTextRevision_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "Recipient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyTextRevision" ADD CONSTRAINT "FamilyTextRevision_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelationshipNote" ADD CONSTRAINT "RelationshipNote_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelationshipNote" ADD CONSTRAINT "RelationshipNote_operatorUserId_fkey" FOREIGN KEY ("operatorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
