import type { ListeningMaterial as StoredMaterial } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { findListeningMaterial, listeningMaterials, type ListeningMaterial, type ListeningCue, type ListeningQuestion } from "@/lib/listening/content";

function toListeningMaterial(stored: StoredMaterial): ListeningMaterial {
  return {
    slug: stored.slug,
    title: stored.title,
    description: stored.description,
    category: stored.category,
    difficulty: stored.difficulty,
    audioUrl: stored.audioUrl,
    cues: Array.isArray(stored.transcript) ? stored.transcript as unknown as ListeningCue[] : [],
    questions: Array.isArray(stored.questions) ? stored.questions as unknown as ListeningQuestion[] : [],
  };
}

export async function getListeningMaterial(slug: string): Promise<ListeningMaterial | undefined> {
  const stored = await prisma.listeningMaterial.findUnique({ where: { slug } });
  if (stored) return stored.isPublished ? toListeningMaterial(stored) : undefined;
  return findListeningMaterial(slug);
}

export async function getPublishedListeningMaterials() {
  const stored = await prisma.listeningMaterial.findMany();
  const overridden = new Set(stored.map((material) => material.slug));
  return [
    ...listeningMaterials.filter((material) => !overridden.has(material.slug)),
    ...stored.filter((material) => material.isPublished).map(toListeningMaterial),
  ];
}

export function builtInListeningData(slug: string) {
  const material = findListeningMaterial(slug);
  if (!material) return null;
  const { cues, ...fields } = material;
  return { ...fields, transcript: cues, duration: Math.ceil(cues.at(-1)?.end ?? 1), isPublished: true };
}
