import assert from "node:assert/strict";
import test from "node:test";
import { gradeTranscription } from "../src/lib/exercises/grading";
import { exerciseSchema } from "../src/lib/exercises/validation";

test("transcription ignores punctuation and case and aligns missing, extra and incorrect words", () => {
  const exact = gradeTranscription("Don’t stop, please.", "DON'T stop please!");
  assert.equal(exact.score, exact.total);
  const result = gradeTranscription("a green boat sails toward the island", "a bright boat toward the distant island");
  assert.equal(result.total, 7);
  assert.equal(result.score, 4);
  assert.deepEqual(result.corrections.filter(({ kind }) => kind !== "match"), [
    { kind: "incorrect", expected: "green", actual: "bright" },
    { kind: "missing", expected: "sails" },
    { kind: "extra", actual: "distant" },
  ]);
});

test("publishing rejects incomplete transcripts and synonym answers outside the passage", () => {
  const base = {
    kind: "TRANSCRIPTION", title: "Practice", description: "Description", category: "SCIENCE", level: "B2",
    coverUrl: "", audioUrl: "", duration: 10, passage: "", target: "", definition: "", translation: "", example: "",
    pronunciation: "", showTranscript: false, isPublished: false, publicationDate: "", questions: [],
  };
  assert.equal(exerciseSchema.safeParse(base).success, true);
  assert.equal(exerciseSchema.safeParse({ ...base, isPublished: true }).success, false);
  const synonym = { ...base, kind: "SYNONYM_HUNTER", target: "tiny", passage: "A small boat crossed the river.", isPublished: true,
    questions: [{ prompt: "Find the synonym.", explanation: "Small means tiny.", options: [{ text: "minute", correct: true }, { text: "river", correct: false }] }],
  };
  assert.equal(exerciseSchema.safeParse(synonym).success, false);
  synonym.questions[0].options[0].text = "small";
  assert.equal(exerciseSchema.safeParse(synonym).success, true);
});
