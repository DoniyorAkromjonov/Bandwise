CREATE TABLE "ListeningMaterial" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "difficulty" "ArticleDifficulty" NOT NULL,
    "duration" INTEGER NOT NULL,
    "audioUrl" TEXT NOT NULL,
    "transcript" JSONB NOT NULL,
    "questions" JSONB NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ListeningMaterial_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ListeningAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "score" INTEGER NOT NULL,
    "questionCount" INTEGER NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ListeningAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ListeningMaterial_slug_key" ON "ListeningMaterial"("slug");
CREATE INDEX "ListeningMaterial_isPublished_category_difficulty_idx" ON "ListeningMaterial"("isPublished", "category", "difficulty");
CREATE INDEX "ListeningAttempt_userId_submittedAt_idx" ON "ListeningAttempt"("userId", "submittedAt");
CREATE INDEX "ListeningAttempt_materialId_idx" ON "ListeningAttempt"("materialId");
ALTER TABLE "ListeningAttempt" ADD CONSTRAINT "ListeningAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ListeningAttempt" ADD CONSTRAINT "ListeningAttempt_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "ListeningMaterial"("id") ON DELETE CASCADE ON UPDATE CASCADE;
