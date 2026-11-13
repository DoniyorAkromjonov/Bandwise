CREATE TYPE "MockTestSkill" AS ENUM ('READING', 'LISTENING');
CREATE TYPE "MockTestStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED');

CREATE TABLE "MockTest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skill" "MockTestSkill" NOT NULL,
    "status" "MockTestStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "title" TEXT NOT NULL,
    "sourceSlug" TEXT NOT NULL,
    "submissionToken" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deadlineAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "score" INTEGER,
    "questionCount" INTEGER,
    CONSTRAINT "MockTest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TestSection" (
    "id" TEXT NOT NULL,
    "mockTestId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "sourceSlug" TEXT NOT NULL,
    "answers" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "reviewQuestionIds" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "score" INTEGER,
    "questionCount" INTEGER,
    CONSTRAINT "TestSection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MockTest_userId_submissionToken_key" ON "MockTest"("userId", "submissionToken");
CREATE INDEX "MockTest_userId_skill_status_startedAt_idx" ON "MockTest"("userId", "skill", "status", "startedAt");
CREATE UNIQUE INDEX "TestSection_mockTestId_position_key" ON "TestSection"("mockTestId", "position");
CREATE INDEX "TestSection_mockTestId_sourceSlug_idx" ON "TestSection"("mockTestId", "sourceSlug");

ALTER TABLE "MockTest" ADD CONSTRAINT "MockTest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TestSection" ADD CONSTRAINT "TestSection_mockTestId_fkey" FOREIGN KEY ("mockTestId") REFERENCES "MockTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;