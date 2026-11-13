import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/../auth";
import { prisma } from "@/lib/prisma";
import { ListeningPlayer } from "@/components/listening/listening-player";
import { getListeningMaterial } from "@/lib/listening/server";

export const instant = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const material = await getListeningMaterial(slug);
  return { title: material ? `${material.title} | Listening Lab` : "Listening Lab" };
}

export default async function ListeningPracticePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ mockTestId?: string }> }) {
  await connection();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const { slug } = await params;
  const { mockTestId } = await searchParams;
  const material = await getListeningMaterial(slug);
  if (!material) notFound();
  let mockTest: { id: string; deadlineAt: string; answers: Record<string, string>; reviewQuestionIds: string[] } | undefined;
  if (mockTestId) {
    const test = await prisma.mockTest.findFirst({ where: { id: mockTestId, userId: session.user.id, skill: "LISTENING", sourceSlug: slug }, include: { sections: { orderBy: { position: "asc" }, take: 1 } } });
    if (!test) notFound();
    if (test.status === "COMPLETED") redirect("/dashboard/mock-tests");
    const section = test.sections[0];
    const savedAnswers = section?.answers;
    const savedReview = section?.reviewQuestionIds;
    mockTest = { id: test.id, deadlineAt: test.deadlineAt.toISOString(), answers: savedAnswers && typeof savedAnswers === "object" && !Array.isArray(savedAnswers) ? Object.fromEntries(Object.entries(savedAnswers).filter((entry): entry is [string, string] => typeof entry[1] === "string")) : {}, reviewQuestionIds: Array.isArray(savedReview) ? savedReview.filter((id): id is string => typeof id === "string") : [] };
  }
  const safeMaterial = {
    ...material,
    cues: mockTest ? [] : material.cues,
    questions: material.questions.map(({ id, prompt, options }) => ({ id, prompt, options })),
  };
  return <ListeningPlayer material={safeMaterial} mockTest={mockTest}/>;
}
