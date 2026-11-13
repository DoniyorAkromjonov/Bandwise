import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { currentUserId } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { awardActivityInTransaction } from "@/lib/gamification";
import { studentExercise } from "@/lib/exercises/server";
import { gradeTranscription, words } from "@/lib/exercises/grading";

const schema = z.object({
  token: z.uuid(),
  revision: z.iso.datetime(),
  answers: z.record(z.string().max(80), z.string().max(300)).optional(),
  transcript: z.string().trim().min(1).max(20000).optional(),
  vocabulary: z.enum(["reviewed", "learned"]).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await currentUserId();
  if (!userId) return Response.json({ error: "Sign in to save your result." }, { status: 401 });
  const { id } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Enter a valid answer." }, { status: 400 });
  const { token, revision, answers, transcript, vocabulary } = parsed.data;
  const key = { userId_token: { userId, token } };
  const existing = await prisma.exerciseAttempt.findUnique({ where: key });
  if (existing) return existing.exerciseId === id
    ? Response.json({ result: existing.answers })
    : Response.json({ error: "This submission has already been used." }, { status: 409 });

  const exercise = await studentExercise(id);
  if (!exercise) return Response.json({ error: "Exercise is unavailable." }, { status: 404 });
  if (exercise.updatedAt.toISOString() !== revision) return Response.json({ error: "The exercise changed. Reload it before submitting." }, { status: 409 });

  let result;
  if (exercise.kind === "TRANSCRIPTION") {
    if (!transcript || !words(transcript).length || words(transcript).length > 1500) return Response.json({ error: "Enter between 1 and 1,500 words." }, { status: 400 });
    result = { ...gradeTranscription(exercise.passage, transcript), transcript };
  } else if (exercise.kind === "ACADEMIC_VOCABULARY") {
    if (!vocabulary) return Response.json({ error: "Choose reviewed or learned." }, { status: 400 });
    result = { score: Number(vocabulary === "learned"), total: 1, vocabulary };
  } else {
    const review = exercise.questions.map((question) => {
      const value = answers?.[question.id];
      const correct = question.options.find((option) => option.correct);
      const chosen = question.options.find((option) => option.id === value);
      const selectedWord = exercise.kind === "SYNONYM_HUNTER" && value?.startsWith("word:") ? value.slice(5) : "";
      const validWord = selectedWord && words(exercise.passage).includes(selectedWord);
      return {
        prompt: question.prompt, explanation: question.explanation,
        expected: correct?.text ?? "", actual: chosen?.text ?? (validWord ? selectedWord : ""),
        correct: Boolean(correct && (chosen?.id === correct.id || (validWord && selectedWord === words(correct.text)[0]))),
      };
    });
    if (!review.length || review.some(({ actual }) => !actual)) return Response.json({ error: "Answer each question before submitting." }, { status: 400 });
    result = { score: review.filter((answer) => answer.correct).length, total: review.length, review };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.exerciseAttempt.create({ data: { exerciseId: id, userId, token, title: exercise.title, score: result.score, total: result.total, answers: result as Prisma.InputJsonValue } });
      await awardActivityInTransaction(tx, userId, `exercise:${id}`, 10);
    });
    return Response.json({ result }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const saved = await prisma.exerciseAttempt.findUnique({ where: key });
      if (saved?.exerciseId === id) return Response.json({ result: saved.answers });
    }
    throw error;
  }
}
