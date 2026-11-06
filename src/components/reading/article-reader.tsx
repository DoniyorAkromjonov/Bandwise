"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Clock3, Expand, Minus, Pause, Play, Plus, RotateCcw, Shrink, Trash2 } from "lucide-react";
import type { ArticleBlock } from "@/lib/reading/content";

export type ReaderHighlight = { id: string; selectedText: string; startOffset: number; endOffset: number; color: string };
type ReaderArticle = { id: string; title: string; slug: string; description: string; category: string; difficulty: string; readingTime: number; wordCount: number; blocks: ArticleBlock[] };
type SavedProgress = { lastPosition: number; completed: boolean; timeSpent: number } | null;

const colors = [
  { value: "YELLOW", label: "Yellow", cls: "bg-[#FFF0A6]" },
  { value: "PURPLE", label: "Purple", cls: "bg-[#E3D9FF]" },
  { value: "BLUE", label: "Blue", cls: "bg-[#CDEEFF]" },
  { value: "GREEN", label: "Green", cls: "bg-[#D6F3D9]" },
];
const difficultyLabels: Record<string, string> = { BEGINNER: "Beginner", INTERMEDIATE: "Intermediate", UPPER_INTERMEDIATE: "Upper-Intermediate", ADVANCED: "Advanced" };
const categoryLabels: Record<string, string> = { TECHNOLOGY: "Technology", SCIENCE: "Science", ENVIRONMENT: "Environment", EDUCATION: "Education", HISTORY: "History", PSYCHOLOGY: "Psychology", SOCIETY: "Society", BUSINESS: "Business", HEALTH: "Health", CULTURE: "Culture" };

export function ArticleReader({ article, initialHighlights, initialProgress }: { article: ReaderArticle; initialHighlights: ReaderHighlight[]; initialProgress: SavedProgress }) {
  const canonicalText = useMemo(() => article.blocks.map((block) => block.text).join("\n"), [article.blocks]);
  const starts = useMemo(() => article.blocks.map((_, index) => article.blocks.slice(0, index).reduce((offset, block) => offset + block.text.length + 1, 0)), [article.blocks]);
  const [highlights, setHighlights] = useState(initialHighlights);
  const [selectedRange, setSelectedRange] = useState<{ start: number; end: number; text: string } | null>(null);
  const [selectedColor, setSelectedColor] = useState("YELLOW");
  const [fontSize, setFontSize] = useState("comfortable");
  const [elapsed, setElapsed] = useState(initialProgress?.timeSpent ?? 0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);
  const [saved, setSaved] = useState(true);
  const [error, setError] = useState("");
  const [resumeChoice, setResumeChoice] = useState(Boolean(initialProgress?.lastPosition && initialProgress.lastPosition > 120 && !initialProgress.completed));
  const [progressPercent, setProgressPercent] = useState(0);
  const rootRef = useRef<HTMLElement>(null);
  const elapsedRef = useRef(initialProgress?.timeSpent ?? 0);
  const startedAtRef = useRef<number | null>(null);
  const lastSentSecondsRef = useRef(initialProgress?.timeSpent ?? 0);
  const lastPositionRef = useRef(initialProgress?.lastPosition ?? 0);
  const flushRef = useRef<(unload?: boolean) => void>(() => undefined);

  const currentElapsed = useCallback(() => elapsedRef.current + (startedAtRef.current ? Math.floor((Date.now() - startedAtRef.current) / 1000) : 0), []);
  const sendProgress = useCallback(async (payload: { lastPosition?: number; completed?: boolean; timeDelta?: number; resetTimer?: boolean }, keepalive = false) => {
    const response = await fetch(`/api/reading/articles/${article.slug}/progress`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), keepalive });
    if (!response.ok) throw new Error("Progress could not be saved.");
  }, [article.slug]);

  const flush = useCallback(async (unload = false) => {
    const now = currentElapsed();
    const delta = Math.max(0, Math.min(60, now - lastSentSecondsRef.current));
    const completed = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 80;
    const payload = { lastPosition: Math.round(window.scrollY), ...(completed ? { completed: true } : {}), ...(delta ? { timeDelta: delta } : {}) };
    lastPositionRef.current = payload.lastPosition;
    if (unload && navigator.sendBeacon) {
      const sent = navigator.sendBeacon(`/api/reading/articles/${article.slug}/progress`, new Blob([JSON.stringify(payload)], { type: "application/json" }));
      if (sent) lastSentSecondsRef.current = now;
      return;
    }
    try { await sendProgress(payload, unload); lastSentSecondsRef.current = now; setSaved(true); }
    catch { setSaved(false); }
  }, [article.slug, currentElapsed, sendProgress]);
  useEffect(() => { flushRef.current = flush; }, [flush]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try { const value = localStorage.getItem("bandwise-reading-text-size"); if (value && ["compact", "comfortable", "large"].includes(value)) setFontSize(value); } catch { /* Storage can be unavailable in private browsing. */ }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [initialProgress]);

  useEffect(() => {
    const interval = window.setInterval(() => setElapsed(currentElapsed()), 1000);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        if (startedAtRef.current) { elapsedRef.current = currentElapsed(); startedAtRef.current = null; setElapsed(elapsedRef.current); setTimerRunning(false); }
        void flushRef.current();
      }
    };
    const onPageHide = () => flushRef.current(true);
    document.addEventListener("visibilitychange", onVisibility); window.addEventListener("pagehide", onPageHide);
    return () => { window.clearInterval(interval); document.removeEventListener("visibilitychange", onVisibility); window.removeEventListener("pagehide", onPageHide); };
  }, [currentElapsed]);

  useEffect(() => {
    const onScroll = () => {
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      setProgressPercent(Math.min(100, Math.round(window.scrollY / maxScroll * 100)));
      setSaved(false);
    };
    let timeout = 0;
    const debounced = () => { onScroll(); window.clearTimeout(timeout); timeout = window.setTimeout(() => void flushRef.current(), 1600); };
    window.addEventListener("scroll", debounced, { passive: true }); onScroll();
    const interval = window.setInterval(() => void flushRef.current(), 15000);
    return () => { window.removeEventListener("scroll", debounced); window.clearTimeout(timeout); window.clearInterval(interval); void flushRef.current(); };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape" && !document.fullscreenElement) setFullScreen(false); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const onFullscreen = () => setFullScreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => document.removeEventListener("fullscreenchange", onFullscreen);
  }, []);

  function locateSelection() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    const locate = (node: Node, offset: number) => {
      const element = node.nodeType === Node.ELEMENT_NODE ? node as HTMLElement : node.parentElement;
      const block = element?.closest<HTMLElement>("[data-reading-index]");
      if (!block) return null;
      const index = Number(block.dataset.readingIndex);
      const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
      let total = 0; let current: Node | null;
      while ((current = walker.nextNode())) {
        if (current === node) return starts[index] + total + offset;
        total += current.textContent?.length ?? 0;
      }
      return null;
    };
    const start = locate(range.startContainer, range.startOffset); const end = locate(range.endContainer, range.endOffset);
    if (start === null || end === null) return;
    const from = Math.min(start, end); const to = Math.max(start, end); const text = canonicalText.slice(from, to);
    if (text.trim()) setSelectedRange({ start: from, end: to, text });
  }

  async function saveHighlight(color = selectedColor) {
    if (!selectedRange) return;
    setError("");
    const response = await fetch(`/api/reading/articles/${article.slug}/highlights`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...selectedRange, color }) });
    const data = await response.json();
    if (!response.ok) { setError(data.error ?? "Could not save highlight."); return; }
    setHighlights((list) => [...list, { id: data.highlight.id, selectedText: data.highlight.selectedText, startOffset: data.highlight.startOffset, endOffset: data.highlight.endOffset, color: data.highlight.color }].sort((a, b) => a.startOffset - b.startOffset));
    setSelectedRange(null); window.getSelection()?.removeAllRanges();
  }

  async function deleteHighlight(id: string) {
    const response = await fetch(`/api/reading/highlights/${id}`, { method: "DELETE" });
    if (response.ok) setHighlights((list) => list.filter((item) => item.id !== id));
    else setError("Could not delete this highlight.");
  }

  function updateFontSize(value: string) { setFontSize(value); try { localStorage.setItem("bandwise-reading-text-size", value); } catch { /* Optional preference. */ } }
  function toggleTimer() {
    if (startedAtRef.current) { elapsedRef.current = currentElapsed(); startedAtRef.current = null; setElapsed(elapsedRef.current); setTimerRunning(false); void flushRef.current(); }
    else { startedAtRef.current = Date.now(); setTimerRunning(true); }
  }
  async function resetTimer() {
    startedAtRef.current = null; elapsedRef.current = 0; lastSentSecondsRef.current = 0; setElapsed(0); setTimerRunning(false);
    try { await sendProgress({ resetTimer: true }); setSaved(true); } catch { setSaved(false); }
  }
  async function toggleFullscreen() {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await rootRef.current?.requestFullscreen(); }
    catch { setFullScreen((value) => !value); }
  }
  function resumeReading() { setResumeChoice(false); window.scrollTo({ top: initialProgress?.lastPosition ?? 0, behavior: "smooth" }); }

  const formattedTime = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;
  const fontClasses = fontSize === "compact" ? "text-[16px] leading-[1.8]" : fontSize === "large" ? "text-[21px] leading-[2]" : "text-[18px] leading-[1.95]";

  return <main ref={rootRef} className={`min-h-screen bg-[#FAFAFC] ${fullScreen ? "fixed inset-0 z-50 overflow-auto p-5" : ""}`}>
    <header className="sticky top-0 z-20 border-b border-[#E8E8F0] bg-white/95 backdrop-blur"><div className="page-shell flex min-h-[66px] items-center justify-between gap-3"><Link href="/dashboard/reading" className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-[#666580] hover:text-[#24213D]"><ArrowLeft size={17}/><span className="hidden sm:inline">Reading Library</span><span className="sm:hidden">Library</span></Link><div className="flex items-center gap-2 sm:gap-3"><span className="inline-flex items-center gap-1.5 text-xs text-[#77768B]"><span className={`size-2 rounded-full ${saved ? "bg-[#43A36A]" : "bg-[#D99B2B]"}`}/>{saved ? "Saved" : "Saving"}</span><button onClick={toggleFullscreen} aria-label={fullScreen ? "Exit fullscreen" : "Enter fullscreen"} className="grid size-9 place-items-center rounded-lg border border-[#E8E8F0] text-[#666580] hover:bg-[#FAFAFC]">{fullScreen ? <Shrink size={16}/> : <Expand size={16}/>}</button></div></div></header>
    <div className="mx-auto max-w-[1120px] px-4 py-7 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-[760px]"><div className="flex flex-wrap items-center gap-2 text-xs font-semibold"><span className="rounded-full bg-[#F1EDFF] px-3 py-1.5 text-[#5F45CC]">{categoryLabels[article.category]}</span><span className="rounded-full bg-white px-3 py-1.5 text-[#77768B]">{difficultyLabels[article.difficulty]}</span></div><h1 className="display-font mt-5 text-3xl tracking-[-.035em] sm:text-4xl">{article.title}</h1><p className="mt-3 text-sm leading-6 text-[#77768B] sm:text-base sm:leading-7">{article.description}</p><div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-[#77768B]"><span className="inline-flex items-center gap-1.5"><BookIcon/> {article.wordCount.toLocaleString()} words</span><span className="inline-flex items-center gap-1.5"><Clock3 size={14}/>{article.readingTime} min read</span></div></div>
      <div className="mx-auto mt-7 grid max-w-[1000px] gap-5 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start">
        <article className="min-w-0 rounded-2xl border border-[#E8E8F0] bg-white px-5 py-7 shadow-[0_14px_40px_-36px_rgba(36,33,61,.3)] sm:px-9 sm:py-10"><div className="mb-7 flex flex-wrap items-center justify-between gap-3 border-b border-[#EEEFF3] pb-5"><div><p className="text-xs font-semibold uppercase tracking-[.12em] text-[#5F45CC]">Reading passage</p><p className="mt-1 text-xs text-[#9998AA]">Select any text to highlight it</p></div><div className="flex items-center gap-1 rounded-lg bg-[#FAFAFC] p-1"><button aria-label="Smaller text" onClick={() => updateFontSize("compact")} className={`grid size-8 place-items-center rounded-md ${fontSize === "compact" ? "bg-white text-[#5F45CC] shadow-sm" : "text-[#77768B]"}`}><Minus size={15}/></button><button aria-label="Comfortable text" onClick={() => updateFontSize("comfortable")} className={`grid size-8 place-items-center rounded-md text-xs font-bold ${fontSize === "comfortable" ? "bg-white text-[#5F45CC] shadow-sm" : "text-[#77768B]"}`}>A</button><button aria-label="Larger text" onClick={() => updateFontSize("large")} className={`grid size-8 place-items-center rounded-md ${fontSize === "large" ? "bg-white text-[#5F45CC] shadow-sm" : "text-[#77768B]"}`}><Plus size={15}/></button></div></div>
          {resumeChoice && <div className="mb-6 flex flex-col gap-3 rounded-xl border border-[#DED8F2] bg-[#F8F6FF] p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold">Continue where you left off?</p><p className="mt-1 text-xs text-[#77768B]">Your previous reading position is saved.</p></div><div className="flex gap-2"><button onClick={() => { setResumeChoice(false); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="rounded-lg border border-[#E8E8F0] bg-white px-3 py-2 text-xs font-semibold">Start over</button><button onClick={resumeReading} className="rounded-lg bg-[#7047FF] px-3 py-2 text-xs font-semibold text-white">Continue</button></div></div>}
          {error && <p role="alert" className="mb-4 rounded-lg bg-[#FFF6F6] p-3 text-sm text-[#A33B48]">{error}</p>}
          <div className={`select-text text-[#34334B] ${fontClasses}`} onMouseUp={locateSelection} onTouchEnd={() => window.setTimeout(locateSelection, 0)}>
            {article.blocks.map((block, index) => <Block key={`${index}-${block.type}`} block={block} index={index} start={starts[index]} highlights={highlights} onClickHighlight={(id) => void deleteHighlight(id)}/>)}
          </div>
          {selectedRange && <div className="sticky bottom-4 z-10 mx-auto mt-6 flex max-w-max flex-wrap items-center justify-center gap-2 rounded-2xl border border-[#E8E8F0] bg-white p-2 shadow-[0_10px_35px_-14px_rgba(36,33,61,.28)]"><span className="px-2 text-xs font-medium text-[#77768B]">Highlight</span>{colors.map((color) => <button key={color.value} title={color.label} aria-label={`Save ${color.label} highlight`} onClick={() => { setSelectedColor(color.value); void saveHighlight(color.value); }} className={`size-7 rounded-full border border-black/5 ${color.cls} hover:scale-110`}/>)}</div>}
        </article>
        <aside className="space-y-4 lg:sticky lg:top-[86px]">
          <section aria-label="Reading timer" className="rounded-2xl border border-[#E8E8F0] bg-white p-5"><div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Reading timer</h2><Clock3 size={16} className="text-[#7047FF]"/></div><p aria-live="polite" className="mt-4 text-4xl font-semibold tabular-nums tracking-[-.04em]">{formattedTime}</p><div className="mt-4 flex gap-2"><button onClick={toggleTimer} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-[#7047FF] px-3 text-sm font-semibold text-white hover:bg-[#5D35EB]">{timerRunning ? <><Pause size={15}/>Pause</> : <><Play size={15}/>{elapsed ? "Resume" : "Start"}</>}</button><button onClick={() => void resetTimer()} aria-label="Reset timer" className="grid size-10 place-items-center rounded-lg border border-[#E8E8F0] text-[#77768B] hover:bg-[#FAFAFC]"><RotateCcw size={15}/></button></div><p className="mt-3 text-xs leading-5 text-[#9998AA]">Timer pauses when you leave this tab.</p></section>
          <section aria-label="Reading progress" className="rounded-2xl border border-[#E8E8F0] bg-white p-5"><div className="flex justify-between text-sm"><h2 className="font-semibold">Reading progress</h2><span className="font-semibold text-[#5F45CC]">{progressPercent}%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-[#F0EFF4]"><div className="h-full rounded-full bg-[#7047FF] transition-[width]" style={{ width: `${progressPercent}%` }}/></div><p className="mt-3 text-xs text-[#9998AA]">Progress saves automatically as you read.</p></section>
          <section aria-label="Saved highlights" className="rounded-2xl border border-[#E8E8F0] bg-white p-5"><div className="flex items-center justify-between"><h2 className="text-sm font-semibold">My highlights</h2><span className="rounded-full bg-[#F3F0FF] px-2 py-0.5 text-xs font-semibold text-[#5F45CC]">{highlights.length}</span></div>{highlights.length ? <ul className="mt-3 max-h-72 space-y-2 overflow-auto">{highlights.map((highlight) => { const tone = colors.find((item) => item.value === highlight.color); return <li key={highlight.id} className={`group rounded-lg p-3 text-xs leading-5 ${tone?.cls ?? "bg-[#F8F7FB]"}`}><div className="flex items-start gap-2"><span className="flex-1">“{highlight.selectedText}”</span><button aria-label="Delete highlight" onClick={() => void deleteHighlight(highlight.id)} className="shrink-0 text-[#77768B] opacity-70 hover:text-[#A33B48]"><Trash2 size={14}/></button></div></li>; })}</ul> : <p className="mt-3 text-xs leading-5 text-[#9998AA]">Select a sentence in the article to save a highlight.</p>}</section>
          <div className="rounded-xl bg-[#F1EDFF] p-4"><p className="text-xs font-semibold text-[#5038BD]">IELTS reading tip</p><p className="mt-1.5 text-xs leading-5 text-[#625A85]">Notice how each paragraph develops one main idea. This helps you locate evidence quickly.</p></div>
        </aside>
      </div>
      <div className="mx-auto mt-6 max-w-[1000px] text-center"><Link href="/dashboard/reading" className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-[#5F45CC] hover:bg-[#F1EDFF]"><Check size={16}/>Finish for now · return to library</Link></div>
    </div>
  </main>;
}

function BookIcon() { return <span aria-hidden="true" className="inline-block size-3.5 rounded-sm border border-current"/>; }

function Block({ block, index, start, highlights, onClickHighlight }: { block: ArticleBlock; index: number; start: number; highlights: ReaderHighlight[]; onClickHighlight(id: string): void }) {
  const end = start + block.text.length;
  const relevant = highlights.filter((item) => item.startOffset < end && item.endOffset > start);
  const boundaries = new Set<number>([0, block.text.length]);
  for (const item of relevant) { boundaries.add(Math.max(0, item.startOffset - start)); boundaries.add(Math.min(block.text.length, item.endOffset - start)); }
  const points = [...boundaries].sort((a, b) => a - b);
  const parts = points.slice(0, -1).map((from, i) => { const to = points[i + 1]; const owners = relevant.filter((item) => item.startOffset < start + to && item.endOffset > start + from); return { from, to, owners }; });
  const Tag = block.type === "heading" ? "h2" : "p";
  return <Tag data-reading-index={index} className={block.type === "heading" ? "mb-3 mt-8 text-xl font-semibold leading-snug tracking-[-.02em] text-[#24213D] first:mt-0" : "mb-5 last:mb-0"}>{parts.map(({ from, to, owners }) => owners.length ? <mark key={`${from}-${to}`} onClick={() => onClickHighlight(owners[0].id)} title="Click to remove this highlight" className={`rounded-sm ${colors.find((color) => color.value === owners[owners.length - 1].color)?.cls ?? "bg-[#FFF0A6]"} cursor-pointer`}>{block.text.slice(from, to)}</mark> : <span key={`${from}-${to}`}>{block.text.slice(from, to)}</span>)}</Tag>;
}
