-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "twoVisitReviewCompanionCallNotes" TEXT,
ADD COLUMN     "twoVisitReviewFamilyCallNotes" TEXT,
ADD COLUMN     "twoVisitReviewRecipientCallNotes" TEXT,
ADD COLUMN     "twoVisitReviewRecipientCalledAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PostVisitReport" ADD COLUMN     "recipientPerspective" TEXT;

-- AlterTable
ALTER TABLE "Visit" ADD COLUMN     "coverSuggested" BOOLEAN NOT NULL DEFAULT false;
