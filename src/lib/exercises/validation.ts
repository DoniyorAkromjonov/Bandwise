import { z } from "zod";
import { ArticleCategory, ExerciseKind, ExerciseLevel } from "@/generated/prisma/enums";
import { isListening } from "./shared";
import { words } from "./grading";

const text = (max: number) => z.string().trim().max(max);
const media = (type: "cover" | "audio") => text(255).refine((url) => !url || (
  type === "cover"
    ? /^\/api\/exercise-media\/image\/[a-f0-9-]+\.(png|jpg|webp)$/.test(url)
    : /^\/(?:api\/exercise-media\/audio|uploads\/audio|audio(?:\/listening)?)\/[a-z0-9-]+\.(mp3|wav|ogg|m4a|aac)$/i.test(url)
), "Upload a supported media file.");

const question = z.object({
  prompt: text(1000).min(1),
  explanation: text(2000).min(1),
  options: z.array(z.object({ text: text(300).min(1), correct: z.boolean() })).min(2).max(8),
}).refine(({ options }) => options.filter(({ correct }) => correct).length === 1 &&
  new Set(options.map(({ text }) => text.toLowerCase())).size === options.length,
"Each question needs distinct options and exactly one correct answer.");

export const exerciseSchema = z.object({
  kind: z.enum(ExerciseKind),
  title: text(200).min(1),
  description: text(1000).min(1),
  category: z.enum(ArticleCategory),
  level: z.enum(ExerciseLevel),
  coverUrl: media("cover"),
  audioUrl: media("audio"),
  duration: z.number().int().min(1).max(7200),
  passage: text(20000),
  target: text(100),
  definition: text(1000),
  translation: text(500),
  example: text(1000),
  pronunciation: text(200),
  showTranscript: z.boolean(),
  isPublished: z.boolean(),
  publicationDate: z.union([z.literal(""), z.iso.datetime()]),
  questions: z.array(question).max(40),
}).superRefine((data, ctx) => {
  const issue = (field: string, message: string) => ctx.addIssue({ code: "custom", path: [field], message });
  if (words(data.passage).length > 1500) issue("passage", "Use at most 1,500 words.");
  if (!data.isPublished) return;
  if (isListening(data.kind) && !data.audioUrl) issue("audioUrl", "Upload an audio file before publishing.");
  if (data.kind === "ACADEMIC_VOCABULARY") {
    if (!data.definition) issue("definition", "Enter a definition.");
    return;
  }
  if ((!isListening(data.kind) || data.kind === "TRANSCRIPTION") && !words(data.passage).length) issue("passage", "Enter the passage or reference transcript.");
  if (data.kind !== "TRANSCRIPTION" && !data.questions.length) issue("questions", "Add a comprehension question.");
  if (data.kind === "CONTEXT_CLUES" && (words(data.target).length !== 1 || !words(data.passage).includes(words(data.target)[0]))) issue("target", "Enter a target word that appears in the passage.");
  if (data.kind === "SYNONYM_HUNTER") {
    if (!data.target) issue("target", "Enter a target word.");
    for (const { options } of data.questions) {
      const answer = options.find(({ correct }) => correct)?.text ?? "";
      if (words(answer).length !== 1 || !words(data.passage).includes(words(answer)[0])) issue("questions", "The correct synonym must be a single word in the passage.");
    }
  }
});

export type ExerciseDraft = z.infer<typeof exerciseSchema>;
