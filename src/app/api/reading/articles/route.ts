import { prisma } from "@/lib/prisma";
import { jsonError, readingUserId } from "@/lib/reading/server";
import { libraryQuerySchema } from "@/lib/reading/validation";

export async function GET(request: Request) {
  const userId = await readingUserId();
  if (!userId) return jsonError("Authentication required", 401);
  const url = new URL(request.url);
  const parsed = libraryQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return jsonError("Invalid library filters", 400);
  const { q, category, difficulty, sort, page } = parsed.data;
  const where = {
    isPublished: true,
    ...(category ? { category } : {}),
    ...(difficulty ? { difficulty } : {}),
    ...(q ? { OR: [
      { title: { contains: q, mode: "insensitive" as const } },
      { description: { contains: q, mode: "insensitive" as const } },
      { content: { contains: q, mode: "insensitive" as const } },
    ] } : {}),
  };
  const orderBy = sort === "time" ? { readingTime: "asc" as const } : sort === "alphabetical" ? { title: "asc" as const } : { createdAt: "desc" as const };
  try {
    const [articles, total] = await Promise.all([
      prisma.article.findMany({ where, orderBy, skip: (page - 1) * 12, take: 12,
        select: { id: true, title: true, slug: true, description: true, category: true, difficulty: true, readingTime: true, wordCount: true, createdAt: true,
          progress: { where: { userId }, select: { completed: true, lastPosition: true } } } }),
      prisma.article.count({ where }),
    ]);
    return Response.json({ articles, total, page, pages: Math.max(1, Math.ceil(total / 12)) });
  } catch {
    return jsonError("Could not load reading library", 500);
  }
}
