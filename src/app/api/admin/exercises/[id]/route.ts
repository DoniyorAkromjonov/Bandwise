import { Prisma } from "@/generated/prisma/client";
import { denied, requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { exerciseData, orderedQuestions } from "@/lib/exercises/server";
import { exerciseSchema } from "@/lib/exercises/validation";
import { mediaExists } from "@/lib/exercises/media";

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Context) {
  const admin = await requireAdmin();
  if (!admin.id) return denied(admin.status);
  const { id } = await params;
  const parsed = exerciseSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues.map((issue) => issue.message).join(" ") }, { status: 400 });
  if (!await mediaExists(parsed.data)) return Response.json({ error: "Upload the missing media file again." }, { status: 400 });
  const { questions, ...fields } = exerciseData(parsed.data);
  try {
    const item = await prisma.$transaction(async (tx) => {
      await tx.exercise.update({ where: { id }, data: fields });
      await tx.exerciseQuestion.deleteMany({ where: { exerciseId: id } });
      return tx.exercise.update({ where: { id }, data: { questions }, include: { questions: orderedQuestions } });
    });
    return Response.json({ item });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") return Response.json({ error: "Exercise not found." }, { status: 404 });
    throw error;
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const admin = await requireAdmin();
  if (!admin.id) return denied(admin.status);
  const { id } = await params;
  const result = await prisma.exercise.deleteMany({ where: { id } });
  return result.count ? Response.json({ deleted: true }) : Response.json({ error: "Exercise not found." }, { status: 404 });
}
