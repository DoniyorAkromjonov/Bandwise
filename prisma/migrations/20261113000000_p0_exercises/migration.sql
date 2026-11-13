-- CreateEnum
CREATE TYPE "ExerciseKind" AS ENUM ('DAILY_ARTICLE', 'SYNONYM_HUNTER', 'CONTEXT_CLUES', 'ACADEMIC_VOCABULARY', 'SHORT_PODCAST', 'DAILY_CONVERSATION', 'TRANSCRIPTION');

-- CreateEnum
CREATE TYPE "ExerciseLevel" AS ENUM ('A2', 'B1', 'B2', 'C1', 'C2');

-- CreateTable
CREATE TABLE "Exercise" (
    "id" TEXT NOT NULL,
    "kind" "ExerciseKind" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "ArticleCategory" NOT NULL,
    "level" "ExerciseLevel" NOT NULL,
    "coverUrl" TEXT,
    "audioUrl" TEXT,
    "duration" INTEGER NOT NULL,
    "passage" TEXT NOT NULL,
    "target" TEXT,
    "definition" TEXT,
    "translation" TEXT,
    "example" TEXT,
    "pronunciation" TEXT,
    "showTranscript" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publicationDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseQuestion" (
    "id" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,

    CONSTRAINT "ExerciseQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseOption" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL,

    CONSTRAINT "ExerciseOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exerciseId" TEXT,
    "token" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "answers" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExerciseAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Exercise_kind_isPublished_publicationDate_idx" ON "Exercise"("kind", "isPublished", "publicationDate");

-- CreateIndex
CREATE UNIQUE INDEX "ExerciseQuestion_exerciseId_position_key" ON "ExerciseQuestion"("exerciseId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "ExerciseOption_questionId_position_key" ON "ExerciseOption"("questionId", "position");

-- CreateIndex
CREATE INDEX "ExerciseAttempt_userId_exerciseId_createdAt_idx" ON "ExerciseAttempt"("userId", "exerciseId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExerciseAttempt_userId_token_key" ON "ExerciseAttempt"("userId", "token");

-- AddForeignKey
ALTER TABLE "ExerciseQuestion" ADD CONSTRAINT "ExerciseQuestion_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseOption" ADD CONSTRAINT "ExerciseOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "ExerciseQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseAttempt" ADD CONSTRAINT "ExerciseAttempt_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseAttempt" ADD CONSTRAINT "ExerciseAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
