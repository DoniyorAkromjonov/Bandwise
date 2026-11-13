"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExerciseCards } from "@/components/exercises/exercise-cards";
import { ArrowRight, BookOpen, Check, ClipboardCheck, Clock3, Search, SlidersHorizontal, X } from "lucide-react";

export type LibraryArticle = { id: string; title: string; slug: string; description: string; category: string; difficulty: string; readingTime: number; wordCount: number; completed: boolean; lastPosition: number };

const categoryLabels: Record<string, string> = { TECHNOLOGY: "Technology", SCIENCE: "Science", ENVIRONMENT: "Environment", EDUCATION: "Education", HISTORY: "History", PSYCHOLOGY: "Psychology", SOCIETY: "Society", BUSINESS: "Business", HEALTH: "Health", CULTURE: "Culture" };
const difficultyLabels: Record<string, string> = { BEGINNER: "Beginner", INTERMEDIATE: "Intermediate", UPPER_INTERMEDIATE: "Upper-Intermediate", ADVANCED: "Advanced" };
const categories = Object.entries(categoryLabels);
const difficulties = Object.entries(difficultyLabels);

export function ReadingLibrary({ initialArticles, total }: { initialArticles: LibraryArticle[]; total: number }) {
  const [mode, setMode] = useState<"read" | "practice" | null>(null);
  const [articles, setArticles] = useState(initialArticles);
  const [count, setCount] = useState(total);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(Math.max(1, Math.ceil(total / 12)));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [requestKey, setRequestKey] = useState(0);
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => { const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 350); return () => window.clearTimeout(timer); }, [query]);
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ q: debouncedQuery, sort, page: String(page) });
    if (category) params.set("category", category);
    if (difficulty) params.set("difficulty", difficulty);
    const timer = window.setTimeout(() => { setLoading(true); setError(""); }, 0);
    fetch(`/api/reading/articles?${params}`, { signal: controller.signal }).then(async (response) => {
      if (!response.ok) throw new Error("We couldn't load the articles. Please try again.");
      return response.json();
    }).then((data) => {
      setArticles(data.articles.map((item: Omit<LibraryArticle, "completed" | "lastPosition"> & { progress: { completed: boolean; lastPosition: number }[] }) => ({ ...item, completed: item.progress[0]?.completed ?? false, lastPosition: item.progress[0]?.lastPosition ?? 0 })));
      setCount(data.total); setPages(data.pages);
    }).catch((reason: Error) => { if (reason.name !== "AbortError") setError(reason.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [debouncedQuery, category, difficulty, sort, page, requestKey]);

  const activeFilters = useMemo(() => Boolean(query || category || difficulty || sort !== "newest"), [query, category, difficulty, sort]);
  function reset() { setQuery(""); setCategory(""); setDifficulty(""); setSort("newest"); setPage(1); }
  function changeFilter(setter: (value: string) => void, value: string) { setter(value); setPage(1); }

  return <>
    <section className="max-w-3xl"><p className="eyebrow">IELTS Academic Reading</p><h1 className="display-font mt-3 text-4xl tracking-[-.035em] sm:text-5xl">Reading Lab</h1><p className="mt-4 max-w-2xl leading-7 text-muted-foreground">Choose a mode for each passage: read it at your own pace, or start a timed IELTS-style practice test.</p><p className="mt-4 text-sm font-medium text-muted-foreground">{total} {total === 1 ? "article" : "articles"} to explore</p></section>
    <section aria-label="Choose a Reading Lab mode" className="mt-7 grid gap-3 sm:grid-cols-2">
      <button type="button" aria-pressed={mode === "read"} onClick={() => setMode("read")} className={`group flex min-h-28 items-center gap-4 rounded-2xl border p-5 text-left transition sm:p-6 ${mode === "read" ? "border-primary bg-secondary ring-2 ring-primary/15" : "border-border bg-card hover:border-primary/50 hover:bg-muted"}`}><span className="grid size-12 shrink-0 place-items-center rounded-xl bg-background text-primary"><BookOpen size={21}/></span><span className="min-w-0 flex-1"><span className="block text-base font-semibold">Academic Articles</span><span className="mt-1 block text-sm leading-5 text-muted-foreground">Open a passage with reading progress and highlights.</span></span><ArrowRight size={18} className="shrink-0 text-muted-foreground transition group-hover:translate-x-0.5"/></button>
      <button type="button" aria-pressed={mode === "practice"} onClick={() => setMode("practice")} className={`group flex min-h-28 items-center gap-4 rounded-2xl border p-5 text-left transition sm:p-6 ${mode === "practice" ? "border-primary bg-secondary ring-2 ring-primary/15" : "border-border bg-card hover:border-primary/50 hover:bg-muted"}`}><span className="grid size-12 shrink-0 place-items-center rounded-xl bg-background text-primary"><ClipboardCheck size={21}/></span><span className="min-w-0 flex-1"><span className="block text-base font-semibold">Practice tests</span><span className="mt-1 block text-sm leading-5 text-muted-foreground">Take a timed IELTS-style test for a passage.</span></span><ArrowRight size={18} className="shrink-0 text-muted-foreground transition group-hover:translate-x-0.5"/></button>
    </section>
    <ExerciseCards skill="reading" />
    {!mode ? <section className="mt-5 rounded-2xl border border-dashed border-border px-5 py-8 text-center"><p className="text-sm font-medium">Choose how you want to study</p><p className="mt-1 text-sm text-muted-foreground">Your articles and practice tests are organised by topic.</p></section> : <>
    <section aria-label="Search and filter articles" className="mt-6 rounded-2xl border border-border bg-card p-4 sm:p-5"><label className="flex min-h-12 items-center gap-3 rounded-xl border border-border bg-background px-4 focus-within:border-[#A996FF]"><Search size={18} className="shrink-0 text-muted-foreground" aria-hidden="true"/><span className="sr-only">Search articles</span><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder={mode === "read" ? "Search articles by title or topic…" : "Search practice tests by title or topic…"} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"/><kbd className="hidden rounded-md border border-border bg-card px-2 py-1 text-[11px] text-muted-foreground sm:block">⌕</kbd></label>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end"><Filter label="Difficulty" value={difficulty} onChange={(value) => changeFilter(setDifficulty, value)} options={difficulties}/><Filter label="Category" value={category} onChange={(value) => changeFilter(setCategory, value)} options={categories}/><label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">Sort by<select value={sort} onChange={(event) => changeFilter(setSort, event.target.value)} className="h-11 rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground"><option value="newest">Newest</option><option value="time">Reading time</option><option value="alphabetical">Alphabetical</option></select></label>{activeFilters && <button onClick={reset} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold text-secondary-foreground hover:bg-secondary"><X size={15}/>Clear filters</button>}</div>
      {activeFilters && <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground"><SlidersHorizontal size={13}/>{[query && `“${query}”`, difficulty && difficultyLabels[difficulty], category && categoryLabels[category], sort !== "newest" && (sort === "time" ? "Reading time" : "Alphabetical")].filter(Boolean).join(" · ")}</p>}
    </section>
    <div className="mt-8 flex items-center justify-between"><h2 className="text-lg font-semibold tracking-[-.02em]">{activeFilters ? "Filtered results" : mode === "read" ? "All articles" : "All practice tests"}</h2><span className="text-sm text-muted-foreground">{loading ? "Updating…" : `${count} found`}</span></div>
    {error ? <div role="alert" className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 p-5 text-sm text-destructive">{error} <button onClick={() => setRequestKey((value) => value + 1)} className="ml-2 font-semibold underline">Retry</button></div> : articles.length === 0 && !loading ? <div className="mt-5 rounded-2xl border border-dashed border-border bg-card px-5 py-14 text-center"><span className="mx-auto grid size-12 place-items-center rounded-full bg-secondary text-primary"><BookOpen size={20}/></span><h3 className="mt-4 text-lg font-semibold">No {mode === "read" ? "articles" : "practice tests"} found</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">Try another search or clear the filters to explore the full library.</p><button onClick={reset} className="mt-4 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white">Clear filters</button></div> : <div aria-busy={loading} className={`mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 ${loading ? "opacity-60" : ""}`}>{articles.map((article) => <ArticleCard key={article.id} article={article} mode={mode}/>)}</div>}
    {pages > 1 && <nav aria-label="Article pages" className="mt-8 flex items-center justify-center gap-3"><button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold disabled:opacity-40">Previous</button><span className="text-sm text-muted-foreground">Page {page} of {pages}</span><button disabled={page >= pages} onClick={() => setPage(page + 1)} className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold disabled:opacity-40">Next</button></nav>}
    </>}
  </>;
}

function Filter({ label, value, onChange, options }: { label: string; value: string; onChange(value: string): void; options: [string, string][] }) {
  return <label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground"><option value="">All {label.toLowerCase()}</option>{options.map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select></label>;
}

function ArticleCard({ article, mode }: { article: LibraryArticle; mode: "read" | "practice" | null }) {
  return <article className="group flex min-h-[260px] flex-col rounded-2xl border border-border bg-card p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[#D2C8FF] hover:shadow-[0_18px_44px_-36px_rgba(36,33,61,.42)] sm:p-6"><div className="flex min-h-6 items-center justify-end">{article.completed && mode === "read" && <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent-foreground"><Check size={14}/>Completed</span>}</div><h3 className="mt-5 text-lg font-semibold leading-6 tracking-[-.025em]">{article.title}</h3><p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">{article.description}</p><div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground"><span>{difficultyLabels[article.difficulty] ?? article.difficulty}</span><span className="inline-flex items-center gap-1"><Clock3 size={13}/>{article.readingTime} min</span><span>{article.wordCount.toLocaleString()} words</span></div>{mode === "read" ? <Link href={`/dashboard/reading/${article.slug}`} className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border px-3 text-sm font-semibold transition hover:border-primary hover:bg-secondary hover:text-secondary-foreground">{article.completed ? "Review article" : article.lastPosition > 0 ? "Continue reading" : "Read article"}<ArrowRight size={15}/></Link> : mode === "practice" ? <Link href={`/dashboard/reading/${article.slug}/practice`} className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90">Practice test<ArrowRight size={15}/></Link> : null}</article>;
}
