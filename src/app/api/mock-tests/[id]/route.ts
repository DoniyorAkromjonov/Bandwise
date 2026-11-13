import { Prisma } from "@/generated/prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/../auth";
import { prisma } from "@/lib/prisma";
import { findListeningMaterial } from "@/lib/listening/content";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return Response.json({ error: "Please sign in to resume this mock test." }, { status: 401 });
  const { id } = await params;
  const test = await prisma.mockTest.findFirst({ where: { id, userId: session.user.id }, include: { sections: { orderBy: { position: "asc" } } } });
  if (!test) return Response.json({ error: "Mock test not found." }, { status: 404 });
  return Response.json({ test: { id: test.id, skill: test.skill, status: test.status, sourceSlug: test.sourceSlug, title: test.title, deadlineAt: test.deadlineAt, completedAt: test.completedAt, score: test.score, questionCount: test.questionCount }, sections: test.sections.map(({ id: sectionId, position, sourceSlug, answers, reviewQuestionIds }) => ({ id: sectionId, position, sourceSlug, answers, reviewQuestionIds })) });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return Response.json({ error: "Please sign in to save this mock test." }, { status: 401 });
  const { id } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid save request." }, { status: 400 }); }
  if (!body || typeof body !== "object") return Response.json({ error: "Invalid save request." }, { status: 400 });
  const { answers, reviewQuestionIds } = body as { answers?: unknown; reviewQuestionIds?: unknown };
  if (!answers || typeof answers !== "object" || Array.isArray(answers) || !Object.values(answers).every((value) => typeof value === "string" && value.length <= 240) || !Array.isArray(reviewQuestionIds) || !reviewQuestionIds.every((value) => typeof value === "string")) return Response.json({ error: "Check the saved answers and try again." }, { status: 400 });
  const test = await prisma.mockTest.findFirst({ where: { id, userId: session.user.id }, include: { sections: true } });
  if (!test) return Response.json({ error: "Mock test not found." }, { status: 404 });
  if (test.status !== "IN_PROGRESS") return Response.json({ error: "This mock test is already complete." }, { status: 409 });
  if (test.deadlineAt.getTime() <= Date.now()) return Response.json({ error: "The time limit has expired; the saved answer sheet is now locked." }, { status: 409 });
  const section = test.sections[0];
  if (!section) return Response.json({ error: "Mock test section not found." }, { status: 404 });
  let validIds: Set<string>;
  if (test.skill === "READING") {
    const article = await prisma.article.findFirst({ where: { slug: test.sourceSlug, isPublished: true }, select: { id: true, activeReadingTestVersion: true } });
    if (!article) return Response.json({ error: "Reading material is no longer available." }, { status: 404 });
    const questions = await prisma.readingQuestion.findMany({ where: { articleId: article.id, testVersion: article.activeReadingTestVersion }, select: { id: true } });
    validIds = new Set(questions.map((question) => question.id));
  } else {
    const material = findListeningMaterial(test.sourceSlug);
    if (!material) return Response.json({ error: "Listening material is no longer available." }, { status: 404 });
    validIds = new Set(material.questions.map((question) => question.id));
  }
  const answerMap = answers as Record<string, string>;
  if (Object.keys(answerMap).some((questionId) => !validIds.has(questionId)) || reviewQuestionIds.some((questionId) => !validIds.has(questionId))) return Response.json({ error: "The saved answer sheet no longer matches this test." }, { status: 400 });
  try {
    await prisma.testSection.update({ where: { id: section.id }, data: { answers: answerMap as Prisma.InputJsonValue, reviewQuestionIds: reviewQuestionIds as string[] } });
    return Response.json({ saved: true });
  } catch (error) {
    console.error("Could not save mock test draft", error);
    return Response.json({ error: "Your answers could not be saved. Please try again." }, { status: 500 });
  }
}
