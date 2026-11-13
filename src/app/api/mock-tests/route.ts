import { Prisma } from "@/generated/prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/../auth";
import { prisma } from "@/lib/prisma";
import { getListeningMaterial } from "@/lib/listening/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return Response.json({ error: "Please sign in to view mock tests." }, { status: 401 });
  const tests = await prisma.mockTest.findMany({
    where: { userId: session.user.id }, orderBy: { startedAt: "desc" }, take: 20,
    select: { id: true, skill: true, status: true, title: true, sourceSlug: true, startedAt: true, deadlineAt: true, completedAt: true, score: true, questionCount: true },
  });
  return Response.json({ tests });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return Response.json({ error: "Please sign in to start a mock test." }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid request body." }, { status: 400 }); }
  if (!body || typeof body !== "object") return Response.json({ error: "Invalid request body." }, { status: 400 });
  const { skill, sourceSlug, submissionToken } = body as Record<string, unknown>;
  if ((skill !== "READING" && skill !== "LISTENING") || typeof sourceSlug !== "string" || sourceSlug.length > 120 || typeof submissionToken !== "string" || !/^[\w-]{16,80}$/.test(submissionToken)) {
    return Response.json({ error: "Choose a valid mock test and try again." }, { status: 400 });
  }
  const existing = await prisma.mockTest.findUnique({ where: { userId_submissionToken: { userId: session.user.id, submissionToken } }, select: { id: true, skill: true, sourceSlug: true, status: true, deadlineAt: true } });
  if (existing) {
    if (existing.skill !== skill || existing.sourceSlug !== sourceSlug) return Response.json({ error: "This start request has already been used." }, { status: 409 });
    return Response.json({ test: existing });
  }
  const template = await prisma.mockTestTemplate.findFirst({ where: { skill, sourceSlug, isPublished: true } });
  if (!template) return Response.json({ error: "This mock test is not currently available." }, { status: 404 });
  if (skill === "READING") {
    const article = await prisma.article.findFirst({ where: { slug: sourceSlug, isPublished: true }, select: { id: true, title: true, activeReadingTestVersion: true } });
    if (!article) return Response.json({ error: "Reading test not found." }, { status: 404 });
    const hasQuestions = await prisma.readingQuestion.count({ where: { articleId: article.id, testVersion: article.activeReadingTestVersion } });
    if (!hasQuestions) return Response.json({ error: "This passage does not have a ready answer key." }, { status: 409 });
  } else {
    const material = await getListeningMaterial(sourceSlug);
    if (!material?.questions.length) return Response.json({ error: "Listening test not found." }, { status: 404 });
  }
  const now = new Date();
  try {
    const test = await prisma.mockTest.create({
      data: { userId: session.user.id, skill, title: template.title, sourceSlug, submissionToken, deadlineAt: new Date(now.getTime() + template.duration * 60_000), sections: { create: { position: 1, sourceSlug } } },
      select: { id: true, skill: true, sourceSlug: true, title: true, status: true, startedAt: true, deadlineAt: true },
    });
    return Response.json({ test }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const duplicate = await prisma.mockTest.findUnique({ where: { userId_submissionToken: { userId: session.user.id, submissionToken } }, select: { id: true, skill: true, sourceSlug: true, status: true, deadlineAt: true } });
      if (duplicate?.skill === skill && duplicate.sourceSlug === sourceSlug) return Response.json({ test: duplicate });
    }
    console.error("Could not start mock test", error);
    return Response.json({ error: "The mock test could not be started. Please try again." }, { status: 500 });
  }
}
