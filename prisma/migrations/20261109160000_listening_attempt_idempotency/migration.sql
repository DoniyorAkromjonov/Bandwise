ALTER TABLE "ListeningAttempt" ADD COLUMN "submissionToken" TEXT NOT NULL DEFAULT '';
UPDATE "ListeningAttempt" SET "submissionToken" = 'legacy-' || "id" WHERE "submissionToken" = '';
CREATE UNIQUE INDEX "ListeningAttempt_userId_submissionToken_key" ON "ListeningAttempt"("userId", "submissionToken");