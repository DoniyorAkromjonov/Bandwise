import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { day7ReadingArticles, day7ReadingQuestionSets } from "../prisma/day7-reading-content";
import { readingQuestionSets } from "../prisma/reading-questions";
import { listeningMaterials } from "../src/lib/listening/content";
import { passwordResetRequestSchema, passwordResetSchema } from "../src/lib/validations/auth";

test("password recovery validates email, token and password confirmation", () => {
  assert.equal(passwordResetRequestSchema.safeParse({ email: "student@example.com" }).success, true);
  assert.equal(passwordResetRequestSchema.safeParse({ email: "not-an-email" }).success, false);
  assert.equal(passwordResetSchema.safeParse({
    token: "a".repeat(43),
    password: "StrongPass123",
    confirmPassword: "StrongPass123",
  }).success, true);
  assert.equal(passwordResetSchema.safeParse({
    token: "short",
    password: "weak",
    confirmPassword: "different",
  }).success, false);
});

test("the original Reading library has 20–30 articles with answer explanations", () => {
  const articleCount = Object.keys(readingQuestionSets).length + day7ReadingArticles.length;
  assert.ok(articleCount >= 20 && articleCount <= 30, `Expected 20–30 articles, found ${articleCount}.`);
  assert.equal(new Set([...Object.keys(readingQuestionSets), ...day7ReadingArticles.map(({ slug }) => slug)]).size, articleCount);

  for (const article of day7ReadingArticles) {
    const wordCount = article.blocks.reduce((total, [type, text]) => total + (type === "paragraph" ? text.trim().split(/\s+/).length : 0), 0);
    assert.ok(wordCount >= 300 && wordCount <= 1000, `${article.slug} has ${wordCount} words.`);
    const questions = day7ReadingQuestionSets[article.slug];
    assert.ok(questions.length >= 5, `${article.slug} needs at least five questions.`);
    assert.ok(new Set(questions.map(({ type }) => type)).size >= 3, `${article.slug} needs varied question types.`);

    for (const question of questions) {
      assert.equal(article.blocks[question.evidenceBlockIndex]?.[0], "paragraph", `${article.slug}: invalid evidence block.`);
      assert.ok(question.prompt.trim().length > 0);
      assert.ok(question.explanation.trim().length > 10);
      assert.ok(question.correctAnswers.length > 0);
      if (question.options) {
        const optionIds = question.options.map(({ id }) => id);
        assert.equal(new Set(optionIds).size, optionIds.length, `${article.slug}: duplicate option IDs.`);
        assert.ok(question.correctAnswers.every((answer) => optionIds.includes(answer)), `${article.slug}: answer is not one of the options.`);
      }
    }
  }
});

test("all five Listening recordings have usable audio, cues and answer keys", () => {
  assert.equal(listeningMaterials.length, 5);
  assert.equal(new Set(listeningMaterials.map(({ slug }) => slug)).size, listeningMaterials.length);

  for (const material of listeningMaterials) {
    const audioPath = join(process.cwd(), "public", ...material.audioUrl.replace(/^\/+/, "").split("/"));
    const audio = readFileSync(audioPath);
    assert.equal(audio.subarray(0, 4).toString(), "RIFF", `${material.slug}: missing WAV header.`);
    assert.equal(audio.subarray(8, 12).toString(), "WAVE", `${material.slug}: invalid WAV file.`);
    assert.ok(material.cues.length >= 8, `${material.slug}: transcript cues are incomplete.`);
    assert.ok(material.questions.length >= 8, `${material.slug}: not enough questions.`);

    let previousEnd = 0;
    for (const cue of material.cues) {
      assert.ok(cue.start >= previousEnd, `${material.slug}: overlapping audio cues.`);
      assert.ok(cue.end > cue.start, `${material.slug}: invalid cue duration.`);
      assert.ok(cue.text.trim().length > 0);
      previousEnd = cue.end;
    }
    for (const question of material.questions) {
      assert.ok(question.options.includes(question.answer), `${material.slug}/${question.id}: answer is not an option.`);
      assert.ok(question.explanation.trim().length > 10);
      assert.ok(material.cues[question.cueIndex], `${material.slug}/${question.id}: cue does not exist.`);
    }
  }
});
