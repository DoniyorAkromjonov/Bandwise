import { prisma } from "@/lib/prisma";
import { getPublishedListeningMaterials } from "@/lib/listening/server";

export async function getMockTestSources() {
  const [articles, counts, listening] = await Promise.all([
    prisma.article.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: "desc" },
      select: { id: true, slug: true, title: true, description: true, category: true, difficulty: true, readingTime: true, wordCount: true, activeReadingTestVersion: true },
    }),
    prisma.readingQuestion.groupBy({
      by: ["articleId", "testVersion"],
      where: { article: { isPublished: true } },
      _count: { _all: true },
    }),
    getPublishedListeningMaterials(),
  ]);
  const questionCounts = new Map(counts.map((entry) => [`${entry.articleId}:${entry.testVersion}`, entry._count._all]));
  return [
    ...articles.flatMap((article) => {
      const questionCount = questionCounts.get(`${article.id}:${article.activeReadingTestVersion}`);
      return questionCount ? [{ ...article, skill: "READING" as const, questionCount }] : [];
    }),
    ...listening.filter((material) => material.questions.length > 0).map((material) => ({
      slug: material.slug,
      title: material.title,
      description: material.description,
      category: material.category,
      difficulty: material.difficulty,
      readingTime: 1,
      wordCount: 0,
      skill: "LISTENING" as const,
      questionCount: material.questions.length,
    })),
  ];
}
