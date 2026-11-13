import { Prisma } from "@/generated/prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/../auth";
import { prisma } from "@/lib/prisma";
import { getListeningMaterial } from "@/lib/listening/server";
import { awardActivityInTransaction } from "@/lib/gamification";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return Response.json({ error: "Please sign in to view your results." }, { status: 401 });
  const userId = session.user.id;
  const { slug } = await params;
  const material = await getListeningMaterial(slug);
  if (!material) return Response.json({ error: "Listening exercise not found." }, { status: 404 });
  const stored = await prisma.listeningMaterial.findUnique({ where: { slug: material.slug }, select: { id: true } });
  if (!stored) return Response.json({ history: [] });
  const history = await prisma.listeningAttempt.findMany({ where: { userId, materialId: stored.id }, orderBy: { submittedAt: "desc" }, take: 10, select: { id: true, score: true, questionCount: true, submittedAt: true } });
  return Response.json({ history });
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return Response.json({ error: "Please sign in to submit your answers." }, { status: 401 });
  const userId = session.user.id;
  const { slug } = await params;
  const material = await getListeningMaterial(slug);
  if (!material) return Response.json({ error: "This listening exercise could not be found." }, { status: 404 });
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "The answers could not be read." }, { status: 400 }); }
  if (!body || typeof body !== "object") return Response.json({ error: "Invalid submission." }, { status: 400 });
  const payload = body as { answers?: unknown; submissionToken?: unknown; mockTestId?: unknown };
  if (payload.mockTestId !== undefined && (typeof payload.mockTestId !== "string" || payload.mockTestId.length > 64)) return Response.json({ error: "Invalid mock test session." }, { status: 400 });
  if (typeof payload.submissionToken !== "string" || !/^[\w-]{16,80}$/.test(payload.submissionToken)) return Response.json({ error: "A valid submission token is required." }, { status: 400 });
  const submissionToken = payload.submissionToken as string;
  const answers = payload.answers;
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) return Response.json({ error: "Please answer each question before submitting." }, { status: 400 });
  const submitted = answers as Record<string, unknown>;
  if (Object.keys(submitted).length !== material.questions.length || material.questions.some((question) => typeof submitted[question.id] !== "string" || (submitted[question.id] !== "" && !question.options.includes(submitted[question.id] as string)))) {
    return Response.json({ error: "Choose one of the listed answers for every question." }, { status: 400 });
  }
  const mockTest = typeof payload.mockTestId === "string" ? await prisma.mockTest.findFirst({ where: { id: payload.mockTestId, userId, skill: "LISTENING", sourceSlug: slug }, include: { sections: { orderBy: { position: "asc" }, take: 1 } } }) : null;
  if (typeof payload.mockTestId === "string" && !mockTest) return Response.json({ error: "Mock test session not found." }, { status: 404 });
  const existing = await prisma.listeningAttempt.findUnique({ where: { userId_submissionToken: { userId, submissionToken } }, include: { material: { select: { slug: true } } } });
  if (existing) {
    if (existing.material.slug !== material.slug) return Response.json({ error: "This submission token has already been used." }, { status: 409 });
    if (typeof payload.mockTestId === "string") await completeListeningMockTest(payload.mockTestId, userId, material.slug, existing.score, existing.questionCount);
    return Response.json({ score: existing.score, questionCount: existing.questionCount, answers: existing.answers, attemptSaved: true, submittedAt: existing.submittedAt });
  }
  if (mockTest?.status === "COMPLETED") return Response.json({ error: "This mock test is already complete." }, { status: 409 });
  let answersToGrade = submitted;
  if (mockTest && mockTest.deadlineAt.getTime() <= Date.now()) {
    const saved = mockTest.sections[0]?.answers;
    answersToGrade = saved && typeof saved === "object" && !Array.isArray(saved) ? saved as Record<string, string> : {};
  }
  const checkedAnswers = material.questions.map((question) => {
    const selected = typeof answersToGrade[question.id] === "string" ? answersToGrade[question.id] as string : "";
    return { id: question.id, prompt: question.prompt, selected, correct: question.answer, isCorrect: selected === question.answer, explanation: question.explanation };
  });
  const score = checkedAnswers.filter((answer) => answer.isCorrect).length;
  try {
    const attempt = await prisma.$transaction(async (tx) => {
      const stored = await tx.listeningMaterial.upsert({
      where: { slug: material.slug }, update: {},
      create: { slug: material.slug, title: material.title, description: material.description, category: material.category, difficulty: material.difficulty as "BEGINNER" | "INTERMEDIATE", duration: Math.round(material.cues.at(-1)?.end ?? 0), audioUrl: material.audioUrl, transcript: material.cues, questions: material.questions, isPublished: true },
      });
      const saved = await tx.listeningAttempt.create({ data: { userId, materialId: stored.id, submissionToken, answers: checkedAnswers, score, questionCount: material.questions.length } });
      await awardActivityInTransaction(tx, userId, `listening:${saved.id}`, 20 + score);
      return saved;
    });
    if (typeof payload.mockTestId === "string") await completeListeningMockTest(payload.mockTestId, userId, material.slug, score, material.questions.length);
    return Response.json({ score, questionCount: material.questions.length, answers: checkedAnswers, attemptSaved: true, submittedAt: attempt.submittedAt });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const duplicate = await prisma.listeningAttempt.findUnique({ where: { userId_submissionToken: { userId, submissionToken } }, include: { material: { select: { slug: true } } } });
      if (duplicate?.material.slug === material.slug) {
        if (typeof payload.mockTestId === "string") await completeListeningMockTest(payload.mockTestId, userId, material.slug, duplicate.score, duplicate.questionCount);
        return Response.json({ score: duplicate.score, questionCount: duplicate.questionCount, answers: duplicate.answers, attemptSaved: true, submittedAt: duplicate.submittedAt });
      }
      return Response.json({ error: "This submission token has already been used." }, { status: 409 });
    }
    console.error("Could not save listening attempt:", error);
    return Response.json({ error: "Your results could not be saved. Please try again." }, { status: 500 });
  }
}

async function completeListeningMockTest(mockTestId: string, userId: string, slug: string, score: number, questionCount: number) {
  const test = await prisma.mockTest.findFirst({ where: { id: mockTestId, userId, skill: "LISTENING", sourceSlug: slug }, include: { sections: { orderBy: { position: "asc" }, take: 1 } } });
  if (!test || !test.sections[0]) throw new Error("Mock test session was not found.");
  if (test.status === "COMPLETED") return;
  await prisma.$transaction([
    prisma.testSection.update({ where: { id: test.sections[0].id }, data: { score, questionCount } }),
    prisma.mockTest.update({ where: { id: test.id }, data: { status: "COMPLETED", completedAt: new Date(), score, questionCount } }),
  ]);
}
