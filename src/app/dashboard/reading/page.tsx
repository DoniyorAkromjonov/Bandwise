import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { ArrowLeft, BookOpenText } from "lucide-react";
import { authOptions } from "@/../auth";
import { prisma } from "@/lib/prisma";
import { ReadingLibrary, type LibraryArticle } from "@/components/reading/reading-library";

export const metadata: Metadata = { title: "Reading Library | Bandwise" };

export default async function ReadingLibraryPage() {
  await connection();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const [total, articles] = await Promise.all([
    prisma.article.count({ where: { isPublished: true } }),
    prisma.article.findMany({ where: { isPublished: true }, orderBy: { createdAt: "desc" }, take: 12,
      select: { id: true, title: true, slug: true, description: true, category: true, difficulty: true, readingTime: true, wordCount: true,
        progress: { where: { userId: session.user.id }, select: { completed: true, lastPosition: true } } } }),
  ]);
  const initial: LibraryArticle[] = articles.map(({ progress, ...article }) => ({ ...article, completed: progress[0]?.completed ?? false, lastPosition: progress[0]?.lastPosition ?? 0 }));

  return <main className="min-h-screen bg-[#FAFAFC]"><header className="border-b border-[#E8E8F0] bg-white"><div className="page-shell flex h-[72px] items-center justify-between"><Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-[#666580] hover:text-[#24213D]"><ArrowLeft size={17} />Dashboard</Link><span className="inline-flex items-center gap-2 text-sm font-semibold"><BookOpenText size={18} className="text-[#7047FF]" />Bandwise Reading</span></div></header><div className="page-shell py-10 sm:py-14"><ReadingLibrary initialArticles={initial} total={total} /></div></main>;
}
