ALTER TYPE "ReadingQuestionType" ADD VALUE 'YES_NO_NOT_GIVEN';
ALTER TYPE "ReadingQuestionType" ADD VALUE 'MATCHING_INFORMATION';
ALTER TYPE "ReadingQuestionType" ADD VALUE 'SUMMARY_NOTE_TABLE_FLOW_CHART_COMPLETION';
ALTER TYPE "ReadingQuestionType" ADD VALUE 'MATCHING_FEATURES';
ALTER TYPE "ReadingQuestionType" ADD VALUE 'MATCHING_SENTENCE_ENDINGS';
ALTER TYPE "ReadingQuestionType" ADD VALUE 'DIAGRAM_LABEL_COMPLETION';
ALTER TYPE "ReadingQuestionType" ADD VALUE 'SHORT_ANSWER';

ALTER TABLE "Article" ADD COLUMN "activeReadingTestVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "ReadingQuestion" ADD COLUMN "testVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "ReadingTestAttempt" ADD COLUMN "testVersion" INTEGER NOT NULL DEFAULT 1;

DROP INDEX "ReadingQuestion_articleId_position_key";
CREATE UNIQUE INDEX "ReadingQuestion_articleId_testVersion_position_key" ON "ReadingQuestion"("articleId", "testVersion", "position");
DROP INDEX "ReadingQuestion_articleId_type_position_idx";
CREATE INDEX "ReadingQuestion_articleId_testVersion_type_position_idx" ON "ReadingQuestion"("articleId", "testVersion", "type", "position");
