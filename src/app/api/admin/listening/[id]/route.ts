import { builtInListeningData } from "@/lib/listening/server";
import {z} from "zod";import {ArticleDifficulty} from "@/generated/prisma/enums";import {prisma} from "@/lib/prisma";import {requireAdmin,denied} from "@/lib/admin";const schema=z.object({title:z.string().trim().min(3).max(200).optional(),description:z.string().trim().min(10).max(1000).optional(),category:z.string().trim().min(2).max(80).optional(),difficulty:z.nativeEnum(ArticleDifficulty).optional(),duration:z.number().int().min(1).max(720).optional(),audioUrl:z.string().trim().min(1).max(500).optional(),transcript:z.array(z.object({start:z.number().nonnegative(),end:z.number().positive(),text:z.string().max(2000)})).max(500).optional(),questions:z.array(z.object({id:z.string().max(100),prompt:z.string().min(1).max(1000),options:z.array(z.string().max(300)).min(2).max(10),answer:z.string().max(300),explanation:z.string().max(2000),cueIndex:z.number().int().nonnegative()})).max(100).optional(),isPublished:z.boolean().optional()});
function getBuiltIn(id: string) {
  return id.startsWith("builtin-") ? builtInListeningData(id.slice("builtin-".length)) : null;
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin.id) return denied(admin.status);
  const { id } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !Object.keys(parsed.data).length) {
    return Response.json({ error: "Invalid listening material.", details: parsed.success ? undefined : parsed.error.flatten() }, { status: 400 });
  }
  const builtIn = getBuiltIn(id);
  const material = await prisma.listeningMaterial.updateManyAndReturn({
    where: builtIn ? { slug: builtIn.slug } : { id },
    data: parsed.data,
  });
  if (material[0]) return Response.json({ material: material[0] });
  if (!builtIn) return Response.json({ error: "Material not found." }, { status: 404 });
  return Response.json({ material: await prisma.listeningMaterial.upsert({
    where: { slug: builtIn.slug },
    create: { ...builtIn, ...parsed.data },
    update: parsed.data,
  }) });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin.id) return denied(admin.status);
  const { id } = await params;
  const builtIn = getBuiltIn(id);
  if (builtIn) {
    const material = await prisma.listeningMaterial.upsert({
      where: { slug: builtIn.slug },
      create: { ...builtIn, isPublished: false },
      update: { isPublished: false },
    });
    return Response.json({ material });
  }

  const result = await prisma.$transaction(async (tx) => {
    const current = await tx.listeningMaterial.findUnique({
      where: { id },
      select: { slug: true, _count: { select: { attempts: true } } },
    });
    if (!current) return null;
    if (builtInListeningData(current.slug) || current._count.attempts) {
      return { material: await tx.listeningMaterial.update({ where: { id }, data: { isPublished: false } }) };
    }
    await tx.listeningMaterial.delete({ where: { id } });
    return { deleted: true };
  }, { isolationLevel: "Serializable" });
  return result ? Response.json(result) : Response.json({ error: "Material not found." }, { status: 404 });
}