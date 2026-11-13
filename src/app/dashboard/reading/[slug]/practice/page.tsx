import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/../auth";
import { prisma } from "@/lib/prisma";
import { articleFingerprint, canonicalArticleText, parseArticleContent, type ArticleBlock } from "@/lib/reading/content";
import type { ReaderHighlight } from "@/components/reading/article-reader";
import { ReadingPractice } from "@/components/reading/reading-practice";

export const metadata: Metadata = { title: "Reading Practice | Bandwise" };
export const instant = false;

type Option = { id: string; text: string };
type PracticeQuestion = { id: string; position: number; type: import("@/generated/prisma/enums").ReadingQuestionType; prompt: string; passageLabel: string | null; options: Option[] };
function parseOptions(value: unknown): Option[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): Option[] => item && typeof item === "object" && "id" in item && "text" in item && typeof item.id === "string" && typeof item.text === "string" ? [{ id: item.id, text: item.text }] : []);
}

export default async function ReadingPracticePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ mockTestId?: string }> }) {
  await connection();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const { slug } = await params;
  const { mockTestId } = await searchParams;
  let mockTest: { id: string; deadlineAt: string; answers: Record<string, string>; reviewQuestionIds: string[] } | undefined;
  if (mockTestId) {
    const test = await prisma.mockTest.findFirst({ where: { id: mockTestId, userId: session.user.id, skill: "READING", sourceSlug: slug }, include: { sections: { orderBy: { position: "asc" }, take: 1 } } });
    if (!test) notFound();
    if (test.status === "COMPLETED") redirect("/dashboard/mock-tests");
    const section = test.sections[0];
    const savedAnswers = section?.answers;
    const savedReview = section?.reviewQuestionIds;
    mockTest = { id: test.id, deadlineAt: test.deadlineAt.toISOString(), answers: savedAnswers && typeof savedAnswers === "object" && !Array.isArray(savedAnswers) ? Object.fromEntries(Object.entries(savedAnswers).filter((entry): entry is [string, string] => typeof entry[1] === "string")) : {}, reviewQuestionIds: Array.isArray(savedReview) ? savedReview.filter((id): id is string => typeof id === "string") : [] };
  }
  const article = await prisma.article.findFirst({
    where: { slug, isPublished: true },
    select: {
      id: true, slug: true, title: true, content: true, activeReadingTestVersion: true,
      testAttempts: { where: { userId: session.user.id }, orderBy: { submittedAt: "desc" }, take: 10, select: { id: true, score: true, questionCount: true, answeredCount: true, submittedAt: true } },
      highlights: { where: { userId: session.user.id }, orderBy: { startOffset: "asc" }, select: { id: true, selectedText: true, startOffset: true, endOffset: true, color: true, contentFingerprint: true } },
    },
  });
  if (!article) notFound();
  const articleQuestions = await prisma.readingQuestion.findMany({ where: { articleId: article.id, testVersion: article.activeReadingTestVersion }, orderBy: { position: "asc" }, select: { id: true, type: true, position: true, prompt: true, passageBlockIndex: true, evidenceBlockIndex: true, options: true } });
  const blocks = parseArticleContent(article.content);
  if (!blocks.length) notFound();
  const text = canonicalArticleText(blocks);
  const fingerprint = articleFingerprint(text);
  const initialHighlights: ReaderHighlight[] = article.highlights.filter((highlight) => highlight.contentFingerprint === fingerprint && text.slice(highlight.startOffset, highlight.endOffset) === highlight.selectedText).map(({ id, selectedText, startOffset, endOffset, color }) => ({ id, selectedText, startOffset, endOffset, color }));
  const paragraphLabels = new Map<number, string>();
  let paragraphCount = 0;
  blocks.forEach((block, index) => { if (block.type === "paragraph") paragraphLabels.set(index, String.fromCharCode(65 + paragraphCount++)); });
  const questions: (PracticeQuestion | null)[] = articleQuestions.map((question) => {
    const passage = question.passageBlockIndex === null ? null : blocks[question.passageBlockIndex];
    if (question.passageBlockIndex !== null && (!passage || passage.type !== "paragraph")) return null;
    if (!blocks[question.evidenceBlockIndex] || blocks[question.evidenceBlockIndex].type !== "paragraph") return null;
    return { id: question.id, position: question.position, type: question.type, prompt: question.prompt, passageLabel: question.passageBlockIndex === null ? null : paragraphLabels.get(question.passageBlockIndex) ?? null, options: parseOptions(question.options) };
  });
  const validQuestions = questions.filter((question): question is PracticeQuestion => question !== null);
  if (validQuestions.length < 5 || validQuestions.length !== articleQuestions.length || new Set(validQuestions.map((question) => question.type)).size < 3) notFound();
  return <ReadingPractice
    article={{ slug: article.slug, title: article.title, testVersion: article.activeReadingTestVersion }}
    blocks={blocks as ArticleBlock[]}
    questions={validQuestions}
    initialHighlights={initialHighlights}
    initialHistory={article.testAttempts.map((attempt) => ({ ...attempt, submittedAt: attempt.submittedAt.toISOString() }))}
    mockTest={mockTest}
  />;
}
