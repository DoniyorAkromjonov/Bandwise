import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { ArrowLeft, ArrowRight, BookOpenText, Clock3, Headphones, Timer } from "lucide-react";
import { authOptions } from "@/../auth";
import { prisma } from "@/lib/prisma";
import { getMockTestSources } from "@/lib/mock-test-sources";
import { MockTestCatalog } from "@/components/mock-tests/mock-test-catalog";

export const metadata: Metadata = { title: "Reading & Listening Mock Tests | Bandwise" };
export const instant = false;

export default async function MockTestsPage() {
  await connection();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const [available, sessions, templates] = await Promise.all([
    getMockTestSources(),
    prisma.mockTest.findMany({ where: { userId: session.user.id }, orderBy: { startedAt: "desc" }, take: 12, select: { id: true, skill: true, status: true, title: true, sourceSlug: true, startedAt: true, deadlineAt: true, completedAt: true, score: true, questionCount: true } }),
    prisma.mockTestTemplate.findMany({ where: { isPublished: true }, select: { skill: true, sourceSlug: true, title: true, duration: true } }),
  ]);
  const sources = new Map(available.map((source) => [`${source.skill}:${source.slug}`, source]));
  const tests = templates.flatMap((template) => {
    const source = sources.get(`${template.skill}:${template.sourceSlug}`);
    return source ? [{ ...source, title: template.title, durationMinutes: template.duration }] : [];
  });
  return <main className="min-h-screen bg-background">
    <header className="border-b border-border bg-card"><div className="page-shell flex h-[68px] items-center justify-between gap-3"><Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft size={16}/>Dashboard</Link><span className="text-sm font-semibold">Bandwise Mock Tests</span></div></header>
    <div className="page-shell py-9 sm:py-12">
      <section className="max-w-3xl"><h1 className="display-font text-4xl tracking-[-.035em] sm:text-5xl">Practice under test conditions</h1><p className="mt-4 max-w-2xl leading-7 text-muted-foreground">Choose a complete Reading passage or Listening exercise. Each timed mock saves your progress, checks every answer and explains the result when you submit.</p><div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground"><span className="inline-flex items-center gap-2"><Timer size={16} className="text-primary"/>Timed session</span><span className="inline-flex items-center gap-2"><Clock3 size={16} className="text-primary"/>Resume after reload</span></div></section>
      <MockTestCatalog tests={tests}/>
      <section aria-labelledby="mock-history-heading" className="mt-12 border-t border-border pt-8"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 id="mock-history-heading" className="text-xl font-semibold">Your test history</h2><p className="mt-1 text-sm text-muted-foreground">Completed results and tests you can resume.</p></div><span className="text-sm text-muted-foreground">{sessions.length} recent</span></div>
        {sessions.length ? <ol className="mt-4 divide-y divide-border border-y border-border">{sessions.map((test) => { const path = test.skill === "READING" ? `/dashboard/reading/${test.sourceSlug}/practice` : `/dashboard/listening/${test.sourceSlug}`; return <li key={test.id} className="flex flex-wrap items-center gap-3 py-4 sm:gap-5"><span className={`grid size-10 shrink-0 place-items-center rounded-xl ${test.skill === "READING" ? "bg-secondary text-primary" : "bg-accent text-accent-foreground"}`}>{test.skill === "READING" ? <BookOpenText size={18}/> : <Headphones size={18}/>}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{test.title}</p><p className="mt-1 text-xs text-muted-foreground">{test.skill === "READING" ? "Reading" : "Listening"} · {test.status === "COMPLETED" ? "Completed" : "In progress"} · {new Date(test.startedAt).toLocaleString()}</p></div>{test.status === "COMPLETED" ? <span className="text-sm font-semibold tabular-nums">{test.score ?? 0}/{test.questionCount ?? 0}</span> : <Link href={`${path}?mockTestId=${encodeURIComponent(test.id)}`} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-secondary">Resume<ArrowRight size={14}/></Link>}</li>; })}</ol> : <p className="mt-4 border-y border-dashed border-border py-8 text-sm text-muted-foreground">Your submitted mock tests will appear here.</p>}
      </section>
    </div>
  </main>;
}
