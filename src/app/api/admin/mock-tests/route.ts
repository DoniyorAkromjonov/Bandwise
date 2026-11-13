import { Prisma } from "@/generated/prisma/client";
import { denied, requireAdmin } from "@/lib/admin";
import { getMockTestSources } from "@/lib/mock-test-sources";
import { prisma } from "@/lib/prisma";
import { mockTestSchema } from "@/lib/validations/mock-test";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.id) return denied(admin.status);
  const [tests, sources] = await Promise.all([
    prisma.mockTestTemplate.findMany({ orderBy: { updatedAt: "desc" } }),
    getMockTestSources(),
  ]);
  return Response.json({ tests, sources: sources.map(({ skill, slug, title }) => ({ skill, slug, title })) });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin.id) return denied(admin.status);
  const parsed = mockTestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid mock test." }, { status: 400 });

  const sources = await getMockTestSources();
  if (!sources.some((source) => source.skill === parsed.data.skill && source.slug === parsed.data.sourceSlug)) {
    return Response.json({ error: "Choose a published material with practice questions." }, { status: 400 });
  }

  try {
    return Response.json({ test: await prisma.mockTestTemplate.create({ data: parsed.data }) }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return Response.json({ error: "This material already has a mock test." }, { status: 409 });
    }
    throw error;
  }
}
