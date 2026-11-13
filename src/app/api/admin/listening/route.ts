import { listeningMaterials } from "@/lib/listening/content";
import { builtInListeningData } from "@/lib/listening/server";
import {z} from "zod";import {ArticleDifficulty} from "@/generated/prisma/enums";import {prisma} from "@/lib/prisma";import {requireAdmin,denied} from "@/lib/admin";const schema=z.object({slug:z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120),title:z.string().trim().min(3).max(200),description:z.string().trim().min(10).max(1000),category:z.string().trim().min(2).max(80),difficulty:z.nativeEnum(ArticleDifficulty),duration:z.number().int().min(1).max(720),audioUrl:z.string().trim().min(1).max(500),transcript:z.array(z.object({start:z.number().nonnegative(),end:z.number().positive(),text:z.string().max(2000)})).max(500),questions:z.array(z.object({id:z.string().max(100),prompt:z.string().min(1).max(1000),options:z.array(z.string().max(300)).min(2).max(10),answer:z.string().max(300),explanation:z.string().max(2000),cueIndex:z.number().int().nonnegative()})).max(100),isPublished:z.boolean()});
export async function GET() {
  const admin = await requireAdmin();
  if (!admin.id) return denied(admin.status);
  const stored = await prisma.listeningMaterial.findMany({ orderBy: { updatedAt: "desc" } });
  const storedSlugs = new Set(stored.map(({ slug }) => slug));
  const builtIns = listeningMaterials.filter(({ slug }) => !storedSlugs.has(slug)).map(({ slug }) => ({
    ...builtInListeningData(slug),
    id: `builtin-${slug}`,
  }));
  return Response.json({ materials: [...stored, ...builtIns] });
}
export async function POST(req:Request){const a=await requireAdmin();if(!a.id)return denied(a.status);const p=schema.safeParse(await req.json().catch(()=>null));if(!p.success)return Response.json({error:"Invalid listening material",details:p.error.flatten()},{status:400});const {slug,...data}=p.data;try{return Response.json({material:await prisma.listeningMaterial.create({data:{slug,...data,transcript:data.transcript,questions:data.questions}})},{status:201});}catch{return Response.json({error:"Slug already exists or data could not be saved"},{status:409});}}
