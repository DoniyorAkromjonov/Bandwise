import { ReadingQuestionType, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { jsonError, readingUserId } from "@/lib/reading/server";
import { readingAttemptSchema } from "@/lib/reading/validation";
import { awardActivityInTransaction } from "@/lib/gamification";

type Option = { id: string; text: string };
function stringArray(value: Prisma.JsonValue): string[] {
  return Array.isArray(value) && value.every((item): item is string => typeof item === "string") ? value : [];
}
function optionsFrom(value: Prisma.JsonValue | null): Option[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const { id, text } = item;
    return typeof id === "string" && typeof text === "string" ? [{ id, text }] : [];
  });
}
function normalizeAnswer(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase("en").replace(/[’]/g, "'").replace(/[^\p{L}\p{N}'-]+/gu, " ").trim().replace(/\s+/g, " ");
}
const textAnswerTypes: ReadingQuestionType[] = ["SENTENCE_COMPLETION", "SUMMARY_NOTE_TABLE_FLOW_CHART_COMPLETION", "DIAGRAM_LABEL_COMPLETION", "SHORT_ANSWER"];
function isTextAnswer(type: ReadingQuestionType) { return textAnswerTypes.includes(type); }
function correctAnswerLabel(type: ReadingQuestionType, answers: string[], options: Option[]) {
  if (type === "TRUE_FALSE_NOT_GIVEN" || type === "YES_NO_NOT_GIVEN") return answers[0] === "NOT_GIVEN" ? "NOT GIVEN" : answers[0];
  if (isTextAnswer(type)) return answers.join(" / ");
  return answers.map((id) => options.find((option) => option.id === id)?.text ?? id).join(" / ");
}

async function completeMockTest(mockTestId: string, userId: string, slug: string, score: number, questionCount: number) {
  const test = await prisma.mockTest.findFirst({ where: { id: mockTestId, userId, skill: "READING", sourceSlug: slug }, include: { sections: { orderBy: { position: "asc" }, take: 1 } } });
  if (!test || !test.sections[0]) throw new Error("Mock test session was not found.");
  if (test.status === "COMPLETED") return;
  await prisma.$transaction([
    prisma.testSection.update({ where: { id: test.sections[0].id }, data: { score, questionCount } }),
    prisma.mockTest.update({ where: { id: test.id }, data: { status: "COMPLETED", completedAt: new Date(), score, questionCount } }),
  ]);
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const userId = await readingUserId();
  if (!userId) return jsonError("Authentication required", 401);
  const { slug } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return jsonError("Invalid request body", 400); }
  const parsed = readingAttemptSchema.safeParse(body);
  if (!parsed.success) return jsonError("Please check your answers and submit again.", 400);

  try {
    const article = await prisma.article.findFirst({ where: { slug, isPublished: true }, select: { id: true, activeReadingTestVersion: true } });
    if (!article) return jsonError("Article not found", 404);
    const mockTest = parsed.data.mockTestId ? await prisma.mockTest.findFirst({ where: { id: parsed.data.mockTestId, userId, skill: "READING", sourceSlug: slug }, include: { sections: { orderBy: { position: "asc" }, take: 1 } } }) : null;
    if (parsed.data.mockTestId && !mockTest) return jsonError("Mock test session not found.", 404);

    const existing = await prisma.readingTestAttempt.findUnique({
      where: { userId_submissionToken: { userId, submissionToken: parsed.data.submissionToken } },
      include: { answers: { include: { question: { select: { position: true } } }, orderBy: { question: { position: "asc" } } } },
    });
    if (existing) {
      if (existing.articleId !== article.id) return jsonError("This submission has already been used.", 409);
      if (parsed.data.mockTestId) await completeMockTest(parsed.data.mockTestId, userId, slug, existing.score, existing.questionCount);
      return Response.json({ attempt: { id: existing.id, score: existing.score, questionCount: existing.questionCount, answeredCount: existing.answeredCount, submittedAt: existing.submittedAt }, answers: existing.answers.map((answer) => ({ questionId: answer.questionId, position: answer.question.position, answer: answer.answer, isCorrect: answer.isCorrect, correctAnswer: answer.correctAnswer, prompt: answer.promptSnapshot, options: answer.optionsSnapshot, explanation: answer.explanation, evidenceBlockIndex: answer.evidenceBlockIndex })) });
    }

    const questions = await prisma.readingQuestion.findMany({ where: { articleId: article.id, testVersion: article.activeReadingTestVersion }, orderBy: { position: "asc" } });
    if (!questions.length) return jsonError("Practice questions are not available for this article yet.", 404);
    if (mockTest?.status === "COMPLETED") return jsonError("This mock test is already complete.", 409);
    let answersToGrade = parsed.data.answers;
    if (mockTest && mockTest.deadlineAt.getTime() <= Date.now()) {
      const storedAnswers = mockTest.sections[0]?.answers;
      const saved = storedAnswers && typeof storedAnswers === "object" && !Array.isArray(storedAnswers) ? storedAnswers as Record<string, unknown> : {};
      answersToGrade = questions.map((question) => ({ questionId: question.id, answer: typeof saved[question.id] === "string" ? saved[question.id] as string : "" }));
    }
    const submittedById = new Map(answersToGrade.map((item) => [item.questionId, item.answer.trim()]));
    if (submittedById.size !== questions.length || questions.some((question) => !submittedById.has(question.id))) return jsonError("The answer sheet does not match this test. Reload and try again.", 400);

    const review = questions.map((question) => {
      const answer = submittedById.get(question.id) ?? "";
      const accepted = stringArray(question.correctAnswers);
      if (!accepted.length) throw new Error(`Question ${question.id} has no valid answer key.`);
      const options = optionsFrom(question.options);
      const isChoice = !isTextAnswer(question.type);
      if (answer && isChoice && !options.some((option) => option.id === answer)) throw new Error("Invalid answer option.");
      const isCorrect = answer !== "" && (isTextAnswer(question.type)
        ? accepted.some((value) => normalizeAnswer(value) === normalizeAnswer(answer))
        : accepted.includes(answer));
      return { questionId: question.id, position: question.position, answer, isCorrect, correctAnswer: correctAnswerLabel(question.type, accepted, options), prompt: question.prompt, options, optionsSnapshot: question.options, explanation: question.explanation, evidenceBlockIndex: question.evidenceBlockIndex };
    });
    const score = review.filter((answer) => answer.isCorrect).length;
    const answeredCount = review.filter((answer) => answer.answer.length > 0).length;

    if (parsed.data.mockTestId) await completeMockTest(parsed.data.mockTestId, userId, slug, score, questions.length);

    let attempt;
    try {
      attempt = await prisma.$transaction(async (tx) => {
        const saved = await tx.readingTestAttempt.create({
        data: {
          userId, articleId: article.id, testVersion: article.activeReadingTestVersion, submissionToken: parsed.data.submissionToken,
          score, questionCount: questions.length, answeredCount,
          answers: { create: review.map((answer) => ({
            answer: answer.answer, isCorrect: answer.isCorrect,
            promptSnapshot: answer.prompt, optionsSnapshot: answer.optionsSnapshot ?? Prisma.DbNull,
            correctAnswer: answer.correctAnswer, explanation: answer.explanation, evidenceBlockIndex: answer.evidenceBlockIndex,
            question: { connect: { id: answer.questionId } },
          })) },
        },
        select: { id: true, score: true, questionCount: true, answeredCount: true, submittedAt: true },
        });
        await awardActivityInTransaction(tx, userId, `reading:${saved.id}`, 20 + score);
        return saved;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const duplicate = await prisma.readingTestAttempt.findUnique({ where: { userId_submissionToken: { userId, submissionToken: parsed.data.submissionToken } }, select: { id: true, articleId: true, score: true, questionCount: true, answeredCount: true, submittedAt: true } });
        if (duplicate?.articleId === article.id) return Response.json({ attempt: duplicate, answers: review });
      }
      throw error;
    }
    return Response.json({ attempt, answers: review });
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid answer option.") return jsonError("Choose one of the available options for each question.", 400);
    console.error("Reading practice submission failed", error);
    return jsonError("We couldn't save this attempt. Please try again.", 500);
  }
}
