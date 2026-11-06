"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Check, Clock3, Search, SlidersHorizontal, X } from "lucide-react";

export type LibraryArticle = { id: string; title: string; slug: string; description: string; category: string; difficulty: string; readingTime: number; wordCount: number; completed: boolean; lastPosition: number };

const categoryLabels: Record<string, string> = { TECHNOLOGY: "Technology", SCIENCE: "Science", ENVIRONMENT: "Environment", EDUCATION: "Education", HISTORY: "History", PSYCHOLOGY: "Psychology", SOCIETY: "Society", BUSINESS: "Business", HEALTH: "Health", CULTURE: "Culture" };
const difficultyLabels: Record<string, string> = { BEGINNER: "Beginner", INTERMEDIATE: "Intermediate", UPPER_INTERMEDIATE: "Upper-Intermediate", ADVANCED: "Advanced" };
const categories = Object.entries(categoryLabels);
const difficulties = Object.entries(difficultyLabels);

export function ReadingLibrary({ initialArticles, total }: { initialArticles: LibraryArticle[]; total: number }) {
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
    <section className="max-w-3xl"><p className="eyebrow">IELTS Academic Reading</p><h1 className="display-font mt-3 text-4xl tracking-[-.035em] sm:text-5xl">Reading Library</h1><p className="mt-4 max-w-2xl leading-7 text-[#666580]">Explore thoughtful articles, build your reading stamina and prepare for the IELTS exam at your own pace.</p><p className="mt-4 text-sm font-medium text-[#77768B]">{total} {total === 1 ? "article" : "articles"} to explore</p></section>
    <section aria-label="Search and filter articles" className="mt-8 rounded-2xl border border-[#E8E8F0] bg-white p-4 sm:p-5"><label className="flex min-h-12 items-center gap-3 rounded-xl border border-[#E8E8F0] bg-[#FAFAFC] px-4 focus-within:border-[#A996FF]"><Search size={18} className="shrink-0 text-[#77768B]" aria-hidden="true"/><span className="sr-only">Search articles</span><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search titles, topics and article text…" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#9998AA]"/><kbd className="hidden rounded-md border border-[#E8E8F0] bg-white px-2 py-1 text-[11px] text-[#9998AA] sm:block">⌕</kbd></label>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end"><Filter label="Difficulty" value={difficulty} onChange={(value) => changeFilter(setDifficulty, value)} options={difficulties}/><Filter label="Category" value={category} onChange={(value) => changeFilter(setCategory, value)} options={categories}/><label className="grid gap-1.5 text-xs font-semibold text-[#77768B]">Sort by<select value={sort} onChange={(event) => changeFilter(setSort, event.target.value)} className="h-11 rounded-lg border border-[#E8E8F0] bg-white px-3 text-sm font-medium text-[#24213D]"><option value="newest">Newest</option><option value="time">Reading time</option><option value="alphabetical">Alphabetical</option></select></label>{activeFilters && <button onClick={reset} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold text-[#5F45CC] hover:bg-[#F7F5FF]"><X size={15}/>Clear filters</button>}</div>
      {activeFilters && <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-[#77768B]"><SlidersHorizontal size={13}/>{[query && `“${query}”`, difficulty && difficultyLabels[difficulty], category && categoryLabels[category], sort !== "newest" && (sort === "time" ? "Reading time" : "Alphabetical")].filter(Boolean).join(" · ")}</p>}
    </section>
    <div className="mt-8 flex items-center justify-between"><h2 className="text-lg font-semibold tracking-[-.02em]">{activeFilters ? "Search results" : "All articles"}</h2><span className="text-sm text-[#77768B]">{loading ? "Updating…" : `${count} found`}</span></div>
    {error ? <div role="alert" className="mt-5 rounded-xl border border-[#F0D1D4] bg-[#FFF7F7] p-5 text-sm text-[#9C3542]">{error} <button onClick={() => setRequestKey((value) => value + 1)} className="ml-2 font-semibold underline">Retry</button></div> : articles.length === 0 && !loading ? <div className="mt-5 rounded-2xl border border-dashed border-[#DCD9E8] bg-white px-5 py-14 text-center"><span className="mx-auto grid size-12 place-items-center rounded-full bg-[#F4F1FF] text-[#7047FF]"><BookOpen size={20}/></span><h3 className="mt-4 text-lg font-semibold">No articles found</h3><p className="mt-2 text-sm leading-6 text-[#77768B]">Try another search or clear the filters to explore the full library.</p><button onClick={reset} className="mt-4 rounded-lg bg-[#7047FF] px-4 py-2.5 text-sm font-semibold text-white">Clear filters</button></div> : <div aria-busy={loading} className={`mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 ${loading ? "opacity-60" : ""}`}>{articles.map((article) => <ArticleCard key={article.id} article={article}/>)}</div>}
    {pages > 1 && <nav aria-label="Article pages" className="mt-8 flex items-center justify-center gap-3"><button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg border border-[#E8E8F0] bg-white px-4 py-2 text-sm font-semibold disabled:opacity-40">Previous</button><span className="text-sm text-[#77768B]">Page {page} of {pages}</span><button disabled={page >= pages} onClick={() => setPage(page + 1)} className="rounded-lg border border-[#E8E8F0] bg-white px-4 py-2 text-sm font-semibold disabled:opacity-40">Next</button></nav>}
  </>;
}

function Filter({ label, value, onChange, options }: { label: string; value: string; onChange(value: string): void; options: [string, string][] }) {
  return <label className="grid gap-1.5 text-xs font-semibold text-[#77768B]">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 rounded-lg border border-[#E8E8F0] bg-white px-3 text-sm font-medium text-[#24213D]"><option value="">All {label.toLowerCase()}</option>{options.map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select></label>;
}

function ArticleCard({ article }: { article: LibraryArticle }) {
  return <article className="group flex min-h-[260px] flex-col rounded-2xl border border-[#E8E8F0] bg-white p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[#D2C8FF] hover:shadow-[0_18px_44px_-36px_rgba(36,33,61,.42)] sm:p-6"><div className="flex items-start justify-between gap-3"><span className="rounded-full bg-[#F3F0FF] px-3 py-1.5 text-xs font-semibold text-[#5F45CC]">{categoryLabels[article.category] ?? article.category}</span>{article.completed && <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#31794E]"><Check size={14}/>Completed</span>}</div><h3 className="mt-5 text-lg font-semibold leading-6 tracking-[-.025em]">{article.title}</h3><p className="mt-2 flex-1 text-sm leading-6 text-[#77768B]">{article.description}</p><div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#77768B]"><span>{difficultyLabels[article.difficulty] ?? article.difficulty}</span><span className="inline-flex items-center gap-1"><Clock3 size={13}/>{article.readingTime} min</span><span>{article.wordCount.toLocaleString()} words</span></div><Link href={`/dashboard/reading/${article.slug}`} className="mt-5 inline-flex min-h-10 items-center justify-between rounded-lg border border-[#E8E8F0] px-3.5 text-sm font-semibold transition group-hover:border-[#7047FF] group-hover:bg-[#F7F5FF] group-hover:text-[#5F45CC]">{article.completed ? "Review article" : article.lastPosition > 0 ? "Continue reading" : "Read article"}<ArrowRight size={15}/></Link></article>;
}
