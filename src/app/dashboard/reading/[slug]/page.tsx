import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/../auth";
import { prisma } from "@/lib/prisma";
import { articleFingerprint, canonicalArticleText, parseArticleContent } from "@/lib/reading/content";
import { ArticleReader, type ReaderHighlight } from "@/components/reading/article-reader";

export const metadata: Metadata = { title: "IELTS Reading | Bandwise" };
export const instant = false;

export default async function ReadingArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  await connection();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const { slug } = await params;
  const article = await prisma.article.findFirst({ where: { slug, isPublished: true }, include: {
    progress: { where: { userId: session.user.id }, take: 1 },
    highlights: { where: { userId: session.user.id }, orderBy: { startOffset: "asc" } },
  } });
  if (!article) notFound();
  const blocks = parseArticleContent(article.content);
  if (!blocks.length) notFound();
  const text = canonicalArticleText(blocks);
  const fingerprint = articleFingerprint(text);
  const highlights: ReaderHighlight[] = article.highlights.filter((item) => item.contentFingerprint === fingerprint && text.slice(item.startOffset, item.endOffset) === item.selectedText).map(({ id, selectedText, startOffset, endOffset, color }) => ({ id, selectedText, startOffset, endOffset, color }));
  const progress = article.progress[0];
  return <ArticleReader article={{ id: article.id, title: article.title, slug: article.slug, description: article.description, category: article.category, difficulty: article.difficulty, readingTime: article.readingTime, wordCount: article.wordCount, blocks }} initialHighlights={highlights} initialProgress={progress ? { lastPosition: progress.lastPosition, completed: progress.completed, timeSpent: progress.timeSpent } : null}/>;
}
