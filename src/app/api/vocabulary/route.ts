import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { currentUserId } from "@/lib/admin";
import { jsonError } from "@/lib/reading/server";
import { awardActivityInTransaction } from "@/lib/gamification";

const schema = z.object({
  word: z.string().trim().min(1).max(100),
  definition: z.string().trim().min(1).max(1000),
  example: z.string().trim().max(1000).optional(),
  articleId: z.string().max(64).optional(),
});

export async function GET(request: Request) {
  const userId = await currentUserId();
  if (!userId) return jsonError("Authentication required", 401);
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
  const articleId = url.searchParams.get("articleId") ?? undefined;
  const source = url.searchParams.get("source");
  if (source && source !== "reading" && source !== "manual") return jsonError("Invalid vocabulary filter", 400);
  const items = await prisma.vocabularyItem.findMany({
    where: {
      userId,
      ...(articleId ? { articleId } : source === "reading" ? { articleId: { not: null } } : source === "manual" ? { articleId: null } : {}),
      ...(q ? { OR: [{ word: { contains: q, mode: "insensitive" } }, { definition: { contains: q, mode: "insensitive" } }] } : {}),
    },
    include: { article: { select: { title: true, slug: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return Response.json({ items });
}

export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) return jsonError("Authentication required", 401);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Enter a valid word and definition", 400);
  if (parsed.data.articleId && !await prisma.article.findUnique({ where: { id: parsed.data.articleId }, select: { id: true } })) return jsonError("Article not found", 404);
  try {
    const item = await prisma.$transaction(async (tx) => {
      const saved = await tx.vocabularyItem.create({ data: { ...parsed.data, userId } });
      const wordKey = parsed.data.word.normalize("NFKC").toLocaleLowerCase("en");
      await awardActivityInTransaction(tx, userId, `vocabulary:${wordKey}`, 5);
      return saved;
    });
    return Response.json({ item }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return jsonError("That word is already in your vocabulary", 409);
    return jsonError("Could not save word", 500);
  }
}

export async function DELETE(request: Request) {
  const userId = await currentUserId();
  if (!userId) return jsonError("Authentication required", 401);
  const body = await request.json().catch(() => null);
  const itemId = z.string().min(1).max(64).safeParse(body?.id);
  if (!itemId.success) return jsonError("Invalid word", 400);
  const result = await prisma.vocabularyItem.deleteMany({ where: { id: itemId.data, userId } });
  return result.count ? Response.json({ deleted: true }) : jsonError("Word not found", 404);
}
