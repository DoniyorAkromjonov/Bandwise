import { prisma } from "@/lib/prisma";
import { jsonError, readingUserId } from "@/lib/reading/server";
import { progressSchema } from "@/lib/reading/validation";

export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const userId = await readingUserId();
  if (!userId) return jsonError("Authentication required", 401);
  const { slug } = await params;
  const input = progressSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return jsonError("Invalid reading progress", 400);
  try {
    const article = await prisma.article.findFirst({ where: { slug, isPublished: true }, select: { id: true, content: true } });
    if (!article) return jsonError("Article not found", 404);
    const maxPosition = article.content.length * 4;
    if (input.data.lastPosition !== undefined && input.data.lastPosition > maxPosition) return jsonError("Reading position is out of range", 400);
    const existing = await prisma.readingProgress.findUnique({ where: { userId_articleId: { userId, articleId: article.id } } });
    const { timeDelta = 0, resetTimer = false, ...updates } = input.data;
    const progress = await prisma.readingProgress.upsert({
      where: { userId_articleId: { userId, articleId: article.id } },
      create: { userId, articleId: article.id, lastPosition: updates.lastPosition ?? 0, completed: updates.completed ?? false, timeSpent: resetTimer ? 0 : timeDelta },
      update: { ...updates, ...(resetTimer ? { timeSpent: 0 } : timeDelta ? { timeSpent: { increment: timeDelta } } : {}), lastReadAt: new Date() },
    });
    if (existing && resetTimer) await prisma.readingProgress.update({ where: { id: progress.id }, data: { timeSpent: 0 } });
    return Response.json({ progress });
  } catch {
    return jsonError("Could not save reading progress", 500);
  }
}

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  return PATCH(request, context);
}
