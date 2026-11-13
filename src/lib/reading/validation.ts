import { z } from "zod";

export const categories = ["TECHNOLOGY", "SCIENCE", "ENVIRONMENT", "EDUCATION", "HISTORY", "PSYCHOLOGY", "SOCIETY", "BUSINESS", "HEALTH", "CULTURE"] as const;
export const difficulties = ["BEGINNER", "INTERMEDIATE", "UPPER_INTERMEDIATE", "ADVANCED"] as const;
export const highlightColors = ["YELLOW", "PURPLE", "BLUE", "GREEN"] as const;

export const highlightSchema = z.object({
  startOffset: z.number().int().nonnegative(),
  endOffset: z.number().int().positive(),
  selectedText: z.string().min(1).max(5000),
  color: z.enum(highlightColors),
}).refine((value) => value.endOffset > value.startOffset, { message: "Invalid text range" });

export const progressSchema = z.object({
  lastPosition: z.number().int().nonnegative().optional(),
  completed: z.boolean().optional(),
  timeDelta: z.number().int().min(0).max(60).optional(),
  resetTimer: z.boolean().optional(),
});

export const libraryQuerySchema = z.object({
  q: z.string().trim().max(100).optional().default(""),
  category: z.enum(categories).optional(),
  difficulty: z.enum(difficulties).optional(),
  sort: z.enum(["newest", "time", "alphabetical"]).optional().default("newest"),
  page: z.coerce.number().int().min(1).max(1000).optional().default(1),
});

export const readingAttemptSchema = z.object({
  submissionToken: z.string().uuid(),
  mockTestId: z.string().min(1).max(64).optional(),
  answers: z.array(z.object({ questionId: z.string().min(1).max(64), answer: z.string().max(240) })).max(50),
}).superRefine(({ answers }, ctx) => {
  const ids = new Set<string>();
  for (const [index, answer] of answers.entries()) {
    if (ids.has(answer.questionId)) ctx.addIssue({ code: "custom", path: ["answers", index, "questionId"], message: "Duplicate question." });
    ids.add(answer.questionId);
  }
});
