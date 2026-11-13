import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { currentUserId } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { availableExercises } from "@/lib/exercises/server";
import { exerciseLabels, readingKinds, listeningKinds, type Kind } from "@/lib/exercises/shared";
import { ArticleCategory, ExerciseLevel } from "@/generated/prisma/enums";

export default async function ExercisesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const params = await searchParams;
  const listening = params.skill === "listening";
  const kinds = listening ? listeningKinds : readingKinds;
  const kind = kinds.find((item) => item === params.kind);
  const category = Object.values(ArticleCategory).find((item) => item === params.category);
  const level = Object.values(ExerciseLevel).find((item) => item === params.level);
  const page = Math.max(1, Math.min(10000, Number(params.page) || 1));
  const skill = listening ? "listening" : "reading";
  const items = await prisma.exercise.findMany({
    where: { ...availableExercises(), kind: kind ?? { in: kinds }, category, level },
    orderBy: [{ publicationDate: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }, { id: "asc" }],
    skip: (Math.floor(page) - 1) * 18,
    take: 19,
    select: { id: true, kind: true, title: true, description: true, category: true, level: true, coverUrl: true, duration: true, attempts: { where: { userId }, take: 1, orderBy: { createdAt: "desc" }, select: { id: true } } },
  });
  const url = (index: number) => `?skill=${skill}&kind=${kind ?? ""}&category=${category ?? ""}&level=${level ?? ""}&page=${index}`;

  return <main className="page-shell space-y-6 py-10">
    <Link href={`/dashboard/${skill}`} className="text-sm text-primary">← {listening ? "Listening Lab" : "Reading Lab"}</Link>
    <h1 className="display-font text-4xl">{kind ? exerciseLabels[kind] : listening ? "Listening exercises" : "Reading exercises"}</h1>
    <form className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="skill" value={skill} />
      <label className="grid gap-1 text-sm">Exercise<select name="kind" defaultValue={kind ?? ""} className="rounded border border-border bg-card p-2"><option value="">All exercises</option>{kinds.map((item: Kind) => <option key={item} value={item}>{exerciseLabels[item]}</option>)}</select></label>
      <label className="grid gap-1 text-sm">Category<select name="category" defaultValue={category ?? ""} className="rounded border border-border bg-card p-2"><option value="">All categories</option>{Object.values(ArticleCategory).map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className="grid gap-1 text-sm">Level<select name="level" defaultValue={level ?? ""} className="rounded border border-border bg-card p-2"><option value="">All levels</option>{Object.values(ExerciseLevel).map((item) => <option key={item}>{item}</option>)}</select></label>
      <button className="rounded bg-primary px-4 py-2 text-white">Apply filters</button>
    </form>
    {items.length ? <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.slice(0, 18).map((item) => <li key={item.id}>
      <Link href={`/dashboard/exercises/${item.id}`} className="block h-full overflow-hidden rounded-2xl border border-border bg-card transition hover:border-primary">
        {item.coverUrl && <div className="h-36 bg-cover bg-center" style={{ backgroundImage: `url(${item.coverUrl})` }} />}
        <div className="space-y-2 p-4"><p className="text-xs text-muted-foreground">{exerciseLabels[item.kind]} · {item.level} · {item.duration} {listening ? "sec" : "min"}</p><h2 className="font-semibold">{item.title}</h2><p className="text-sm text-muted-foreground">{item.description}</p>{item.attempts.length > 0 && <p className="text-xs font-semibold text-primary">Attempt saved</p>}</div>
      </Link>
    </li>)}</ul> : <p className="rounded-xl border border-dashed border-border p-6 text-muted-foreground">No published exercises match these filters.</p>}
    <nav aria-label="Exercise pages" className="flex gap-4 text-sm text-primary">{page > 1 && <Link href={url(page - 1)}>Previous</Link>}{items.length > 18 && <Link href={url(page + 1)}>Next</Link>}</nav>
  </main>;
}
