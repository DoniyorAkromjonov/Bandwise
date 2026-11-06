-- CreateEnum
CREATE TYPE "ArticleCategory" AS ENUM ('TECHNOLOGY', 'SCIENCE', 'ENVIRONMENT', 'EDUCATION', 'HISTORY', 'PSYCHOLOGY', 'SOCIETY', 'BUSINESS', 'HEALTH', 'CULTURE');

-- CreateEnum
CREATE TYPE "ArticleDifficulty" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'UPPER_INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "HighlightColor" AS ENUM ('YELLOW', 'PURPLE', 'BLUE', 'GREEN');

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" "ArticleCategory" NOT NULL,
    "difficulty" "ArticleDifficulty" NOT NULL,
    "readingTime" INTEGER NOT NULL,
    "wordCount" INTEGER NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Highlight" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "selectedText" TEXT NOT NULL,
    "startOffset" INTEGER NOT NULL,
    "endOffset" INTEGER NOT NULL,
    "color" "HighlightColor" NOT NULL,
    "contentFingerprint" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Highlight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadingProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "lastPosition" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "timeSpent" INTEGER NOT NULL DEFAULT 0,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReadingProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Article_slug_key" ON "Article"("slug");

-- CreateIndex
CREATE INDEX "Article_isPublished_category_difficulty_createdAt_idx" ON "Article"("isPublished", "category", "difficulty", "createdAt");

-- CreateIndex
CREATE INDEX "Article_isPublished_title_idx" ON "Article"("isPublished", "title");

-- CreateIndex
CREATE INDEX "Highlight_userId_articleId_idx" ON "Highlight"("userId", "articleId");

-- CreateIndex
CREATE INDEX "Highlight_articleId_idx" ON "Highlight"("articleId");

-- CreateIndex
CREATE INDEX "ReadingProgress_userId_lastReadAt_idx" ON "ReadingProgress"("userId", "lastReadAt");

-- CreateIndex
CREATE INDEX "ReadingProgress_articleId_idx" ON "ReadingProgress"("articleId");

-- CreateIndex
CREATE UNIQUE INDEX "ReadingProgress_userId_articleId_key" ON "ReadingProgress"("userId", "articleId");

-- AddForeignKey
ALTER TABLE "Highlight" ADD CONSTRAINT "Highlight_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Highlight" ADD CONSTRAINT "Highlight_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingProgress" ADD CONSTRAINT "ReadingProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingProgress" ADD CONSTRAINT "ReadingProgress_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
