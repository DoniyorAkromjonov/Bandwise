import { prisma } from "@/lib/prisma";
import { articleFingerprint, canonicalArticleText, parseArticleContent } from "@/lib/reading/content";
import { jsonError, readingUserId } from "@/lib/reading/server";
import { highlightSchema } from "@/lib/reading/validation";

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const userId = await readingUserId();
  if (!userId) return jsonError("Authentication required", 401);
  const { slug } = await params;
  const input = highlightSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return jsonError("Invalid highlight", 400);
  try {
    const article = await prisma.article.findFirst({ where: { slug, isPublished: true }, select: { id: true, content: true } });
    if (!article) return jsonError("Article not found", 404);
    const text = canonicalArticleText(parseArticleContent(article.content));
    const { startOffset, endOffset, selectedText, color } = input.data;
    if (endOffset > text.length || text.slice(startOffset, endOffset) !== selectedText) return jsonError("The selected text no longer matches this article", 400);
    const highlight = await prisma.highlight.create({ data: { userId, articleId: article.id, selectedText, startOffset, endOffset, color, contentFingerprint: articleFingerprint(text) } });
    return Response.json({ highlight }, { status: 201 });
  } catch {
    return jsonError("Could not save highlight", 500);
  }
}
