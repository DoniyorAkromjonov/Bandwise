-- CreateEnum
CREATE TYPE "ReadingQuestionType" AS ENUM ('MULTIPLE_CHOICE', 'TRUE_FALSE_NOT_GIVEN', 'SENTENCE_COMPLETION', 'MATCHING_HEADINGS');

-- CreateTable
CREATE TABLE "ReadingQuestion" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "type" "ReadingQuestionType" NOT NULL,
    "position" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,
    "passageBlockIndex" INTEGER,
    "evidenceBlockIndex" INTEGER NOT NULL,
    "options" JSONB,
    "correctAnswers" JSONB NOT NULL,
    "explanation" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReadingQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadingTestAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "submissionToken" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "questionCount" INTEGER NOT NULL,
    "answeredCount" INTEGER NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReadingTestAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadingUserAnswer" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answer" TEXT NOT NULL DEFAULT '',
    "isCorrect" BOOLEAN NOT NULL,
    "promptSnapshot" TEXT NOT NULL,
    "optionsSnapshot" JSONB,
    "correctAnswer" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "evidenceBlockIndex" INTEGER NOT NULL,

    CONSTRAINT "ReadingUserAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReadingQuestion_articleId_type_position_idx" ON "ReadingQuestion"("articleId", "type", "position");

-- CreateIndex
CREATE UNIQUE INDEX "ReadingQuestion_articleId_position_key" ON "ReadingQuestion"("articleId", "position");

-- CreateIndex
CREATE INDEX "ReadingTestAttempt_userId_articleId_submittedAt_idx" ON "ReadingTestAttempt"("userId", "articleId", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReadingTestAttempt_userId_submissionToken_key" ON "ReadingTestAttempt"("userId", "submissionToken");

-- CreateIndex
CREATE INDEX "ReadingUserAnswer_questionId_idx" ON "ReadingUserAnswer"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "ReadingUserAnswer_attemptId_questionId_key" ON "ReadingUserAnswer"("attemptId", "questionId");

-- AddForeignKey
ALTER TABLE "ReadingQuestion" ADD CONSTRAINT "ReadingQuestion_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingTestAttempt" ADD CONSTRAINT "ReadingTestAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingTestAttempt" ADD CONSTRAINT "ReadingTestAttempt_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingUserAnswer" ADD CONSTRAINT "ReadingUserAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "ReadingTestAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingUserAnswer" ADD CONSTRAINT "ReadingUserAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "ReadingQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
