import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/../auth";
import { ListeningLibrary } from "@/components/listening/listening-library";
import { getPublishedListeningMaterials } from "@/lib/listening/server";

export const metadata: Metadata = { title: "Listening Lab | Bandwise" };
export const instant = false;

export default async function ListeningLibraryPage() {
  await connection();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const materials = await getPublishedListeningMaterials();
  return <ListeningLibrary materials={materials.map((material) => ({
    slug: material.slug,
    title: material.title,
    description: material.description,
    category: material.category,
    difficulty: material.difficulty,
    audioUrl: material.audioUrl,
  }))} />;
}
