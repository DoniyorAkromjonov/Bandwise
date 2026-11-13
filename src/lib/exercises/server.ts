import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { ExerciseDraft } from "./validation";

export const orderedQuestions = {
  orderBy: { position: "asc" },
  include: { options: { orderBy: { position: "asc" } } },
} satisfies Prisma.ExerciseQuestionFindManyArgs;

export function availableExercises(now = new Date()): Prisma.ExerciseWhereInput {
  return { isPublished: true, OR: [{ publicationDate: null }, { publicationDate: { lte: now } }] };
}

export function exerciseData(draft: ExerciseDraft) {
  const { questions, publicationDate, coverUrl, audioUrl, ...fields } = draft;
  return {
    ...fields,
    publicationDate: publicationDate ? new Date(publicationDate) : null,
    coverUrl: coverUrl || null,
    audioUrl: audioUrl || null,
    questions: {
      create: questions.map(({ options, ...question }, position) => ({
        ...question, position,
        options: { create: options.map((option, position) => ({ ...option, position })) },
      })),
    },
  };
}

export async function studentExercise(id: string) {
  return prisma.exercise.findFirst({ where: { id, ...availableExercises() }, include: { questions: orderedQuestions } });
}

export type StudentExercise = NonNullable<Awaited<ReturnType<typeof studentExercise>>>;
export function publicExercise({ questions, ...exercise }: StudentExercise) {
  return {
    ...exercise,
    publicationDate: exercise.publicationDate?.toISOString() ?? null,
    createdAt: exercise.createdAt.toISOString(),
    updatedAt: exercise.updatedAt.toISOString(),
    passage: exercise.kind === "TRANSCRIPTION" || (exercise.audioUrl && !exercise.showTranscript) ? "" : exercise.passage,
    questions: questions.map(({ id, prompt, options }) => ({ id, prompt, options: options.map(({ id, text }) => ({ id, text })) })),
  };
}

export type PublicExercise = ReturnType<typeof publicExercise>;
