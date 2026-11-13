import { Prisma } from "@/generated/prisma/client";
import { denied, requireAdmin } from "@/lib/admin";
import { getMockTestSources } from "@/lib/mock-test-sources";
import { prisma } from "@/lib/prisma";
import { mockTestSchema } from "@/lib/validations/mock-test";

export async function PUT(request: Request, { params }: RouteContext<"/api/admin/mock-tests/[id]">) {
  const admin = await requireAdmin();
  if (!admin.id) return denied(admin.status);
  const { id } = await params;
  const parsed = mockTestSchema.partial().safeParse(await request.json().catch(() => null));
  if (!parsed.success || !Object.keys(parsed.data).length) {
    return Response.json({ error: "Invalid mock test." }, { status: 400 });
  }

  const current = await prisma.mockTestTemplate.findUnique({ where: { id } });
  if (!current) return Response.json({ error: "Mock test not found." }, { status: 404 });
  const next = { ...current, ...parsed.data };
  if (next.isPublished || next.skill !== current.skill || next.sourceSlug !== current.sourceSlug) {
    const sources = await getMockTestSources();
    if (!sources.some((source) => source.skill === next.skill && source.slug === next.sourceSlug)) {
      return Response.json({ error: "Choose a published material with practice questions." }, { status: 400 });
    }
  }

  try {
    return Response.json({ test: await prisma.mockTestTemplate.update({ where: { id }, data: parsed.data }) });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") return Response.json({ error: "This material already has a mock test." }, { status: 409 });
      if (error.code === "P2025") return Response.json({ error: "Mock test not found." }, { status: 404 });
    }
    throw error;
  }
}

export async function DELETE(_request: Request, { params }: RouteContext<"/api/admin/mock-tests/[id]">) {
  const admin = await requireAdmin();
  if (!admin.id) return denied(admin.status);
  const { id } = await params;
  const deleted = await prisma.mockTestTemplate.deleteMany({ where: { id } });
  return deleted.count
    ? Response.json({ deleted: true })
    : Response.json({ error: "Mock test not found." }, { status: 404 });
}
