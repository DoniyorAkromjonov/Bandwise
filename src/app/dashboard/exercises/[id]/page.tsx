import Link from "next/link";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { currentUserId } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { publicExercise, studentExercise } from "@/lib/exercises/server";
import { isListening } from "@/lib/exercises/shared";
import { ExercisePlayer, type Attempt } from "@/components/exercises/player";

export default async function ExercisePage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const { id } = await params;
  const exercise = await studentExercise(id);
  if (!exercise) notFound();

  const attempts = await prisma.exerciseAttempt.findMany({ where: { userId, exerciseId: id }, orderBy: { createdAt: "desc" }, take: 15 });
  return <main className="page-shell py-10">
    <Link href={`/dashboard/exercises?skill=${isListening(exercise.kind) ? "listening" : "reading"}`} className="mb-5 inline-block text-sm text-primary">← Exercises</Link>
    <ExercisePlayer exercise={publicExercise(exercise)} attempts={attempts.map(({ id, createdAt, answers }) => ({ id, date: createdAt.toISOString(), result: answers as Attempt["result"] }))} />
  </main>;
}
