import { z } from "zod";
import { ArticleCategory, ExerciseKind, ExerciseLevel, Prisma } from "@/generated/prisma/client";
import { denied, requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { exerciseData, orderedQuestions } from "@/lib/exercises/server";
import { exerciseSchema } from "@/lib/exercises/validation";
import { mediaExists } from "@/lib/exercises/media";

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (!admin.id) return denied(admin.status);
  const params = new URL(request.url).searchParams;
  const kind = z.enum(ExerciseKind).safeParse(params.get("kind")).data;
  const category = z.enum(ArticleCategory).safeParse(params.get("category")).data;
  const level = z.enum(ExerciseLevel).safeParse(params.get("level")).data;
  const query = params.get("q")?.trim().slice(0, 200);
  const page = z.coerce.number().int().min(1).max(10000).safeParse(params.get("page")).data ?? 1;
  const status = params.get("status");
  const sort = z.enum(["category", "level", "isPublished", "updatedAt"]).safeParse(params.get("sort")).data ?? "updatedAt";
  const where: Prisma.ExerciseWhereInput = {
    kind, category, level,
    title: query ? { contains: query, mode: "insensitive" } : undefined,
    isPublished: status === "published" ? true : status === "draft" ? false : undefined,
  };
  const items = await prisma.exercise.findMany({
    where, orderBy: [{ [sort]: sort === "updatedAt" ? "desc" : "asc" }, { id: "asc" }],
    skip: (page - 1) * 20, take: 21, include: { questions: orderedQuestions },
  });
  return Response.json({ items: items.slice(0, 20), hasMore: items.length > 20 });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin.id) return denied(admin.status);
  const parsed = exerciseSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues.map((issue) => issue.message).join(" ") }, { status: 400 });
  if (!await mediaExists(parsed.data)) return Response.json({ error: "Upload the missing media file again." }, { status: 400 });
  const item = await prisma.exercise.create({ data: exerciseData(parsed.data), include: { questions: orderedQuestions } });
  return Response.json({ item }, { status: 201 });
}
