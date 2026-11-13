"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowDown, ArrowLeft, ArrowRight, Check, Clock3, Expand, ExternalLink, Focus, Highlighter, Minimize2, Minus, Plus, RotateCcw, X } from "lucide-react";
import type { ReadingQuestionType } from "@/generated/prisma/enums";
import type { ArticleBlock } from "@/lib/reading/content";
import type { ReaderHighlight } from "@/components/reading/article-reader";

type Option = { id: string; text: string };
type Question = { id: string; position: number; type: ReadingQuestionType; prompt: string; passageLabel: string | null; options: Option[] };
type AttemptSummary = { id: string; score: number; questionCount: number; answeredCount: number; submittedAt: string };
type ReviewAnswer = { questionId: string; position: number; answer: string; isCorrect: boolean; correctAnswer: string; prompt: string; options: Option[]; explanation: string; evidenceBlockIndex: number };
type SubmissionResult = { attempt: AttemptSummary; answers: ReviewAnswer[] };
type ActiveSelection = { start: number; end: number; text: string; top: number; left: number; placement: "above" | "below" };

const LIMIT_SECONDS = 20 * 60;
const colors = [
  { value: "YELLOW", label: "Yellow", cls: "highlight-yellow", ink: "text-[#C98200]" },
  { value: "PURPLE", label: "Purple", cls: "highlight-purple", ink: "text-primary" },
  { value: "BLUE", label: "Blue", cls: "highlight-blue", ink: "text-[#1685B4]" },
  { value: "GREEN", label: "Green", cls: "highlight-green", ink: "text-[#39834E]" },
];
const textAnswerTypes: ReadingQuestionType[] = ["SENTENCE_COMPLETION", "SUMMARY_NOTE_TABLE_FLOW_CHART_COMPLETION", "DIAGRAM_LABEL_COMPLETION", "SHORT_ANSWER"];
const typeLabels: Record<ReadingQuestionType, string> = {
  MULTIPLE_CHOICE: "Multiple choice",
  TRUE_FALSE_NOT_GIVEN: "True / False / Not Given",
  YES_NO_NOT_GIVEN: "Yes / No / Not Given",
  MATCHING_INFORMATION: "Matching information",
  MATCHING_HEADINGS: "Matching headings",
  MATCHING_FEATURES: "Matching features",
  MATCHING_SENTENCE_ENDINGS: "Matching sentence endings",
  SENTENCE_COMPLETION: "Sentence completion",
  SUMMARY_NOTE_TABLE_FLOW_CHART_COMPLETION: "Summary / note / table / flow-chart completion",
  DIAGRAM_LABEL_COMPLETION: "Diagram label completion",
  SHORT_ANSWER: "Short-answer questions",
};

export function ReadingPractice({ article, blocks, questions, initialHighlights, initialHistory, mockTest }: { article: { slug: string; title: string; testVersion: number }; blocks: ArticleBlock[]; questions: Question[]; initialHighlights: ReaderHighlight[]; initialHistory: AttemptSummary[]; mockTest?: { id: string; deadlineAt: string; answers: Record<string, string>; reviewQuestionIds: string[] } }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [answersReady, setAnswersReady] = useState(false);
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [history, setHistory] = useState(initialHistory);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reviewIds, setReviewIds] = useState<string[]>([]);
  const [remaining, setRemaining] = useState(LIMIT_SECONDS);
  const [timerReady, setTimerReady] = useState(false);
  const [timerSession, setTimerSession] = useState(0);
  const [focusMode, setFocusMode] = useState(false);
  const [nativeFullscreen, setNativeFullscreen] = useState(false);
  const [passageFontSize, setPassageFontSize] = useState(18);
  const [mobilePane, setMobilePane] = useState<"passage" | "questions">("passage");
  const [splitPercent, setSplitPercent] = useState(50);
  const [draggingSplit, setDraggingSplit] = useState(false);
  const [highlights, setHighlights] = useState(initialHighlights);
  const [selection, setSelection] = useState<ActiveSelection | null>(null);
  const [highlightError, setHighlightError] = useState("");
  const rootRef = useRef<HTMLElement>(null);
  const panesRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const tokenRef = useRef("");
  const busyRef = useRef(false);
  const submittedRef = useRef(false);
  const mockSaveTimeoutRef = useRef<number | null>(null);
  const mockSavePromiseRef = useRef<Promise<void> | null>(null);
  const timeExpiredRef = useRef(false);
  const submitRef = useRef<() => void>(() => undefined);
  const canonicalText = useMemo(() => blocks.map((block) => block.text).join("\n"), [blocks]);
  const starts = useMemo(() => blocks.map((_, index) => blocks.slice(0, index).reduce((offset, block) => offset + block.text.length + 1, 0)), [blocks]);
  const answeredCount = Object.values(answers).filter((answer) => answer.trim()).length;
  const questionRange = `1–${questions.length}`;
  const answerKey = `bandwise-reading-test-draft:${article.slug}:v${article.testVersion}${mockTest ? `:mock:${mockTest.id}` : ""}`;
  const timerKey = `bandwise-reading-test-deadline:${article.slug}:v${article.testVersion}${mockTest ? `:mock:${mockTest.id}` : ""}`;
  const tokenKey = `bandwise-reading-test-token:${article.slug}:v${article.testVersion}${mockTest ? `:mock:${mockTest.id}` : ""}`;

  useEffect(() => {
    let restoredAnswers: Record<string, string> | null = mockTest?.answers ?? null;
    const restoredReviewIds = mockTest?.reviewQuestionIds ?? [];
    try {
      const draft = localStorage.getItem(answerKey);
      if (draft) {
        const saved = JSON.parse(draft) as unknown;
        if (saved && typeof saved === "object" && !Array.isArray(saved)) restoredAnswers = saved as Record<string, string>;
      }
      tokenRef.current = localStorage.getItem(tokenKey) ?? "";
    } catch { /* Local draft saving is a convenience; the server remains authoritative. */ }
    const restore = window.setTimeout(() => { if (restoredAnswers) setAnswers(restoredAnswers); setReviewIds(restoredReviewIds); setAnswersReady(true); }, 0);
    return () => window.clearTimeout(restore);
  }, [answerKey, tokenKey, mockTest]);

  useEffect(() => {
    if (!answersReady || result) return;
    try { localStorage.setItem(answerKey, JSON.stringify(answers)); } catch { /* Optional draft persistence. */ }
  }, [answerKey, answers, answersReady, result]);

  useEffect(() => {
    if (!answersReady) return;
    let deadline = 0;
    try { deadline = mockTest ? new Date(mockTest.deadlineAt).getTime() : Number(localStorage.getItem(timerKey)); } catch { /* Use a fresh in-memory timer if storage is unavailable. */ }
    if (!Number.isFinite(deadline) || deadline <= 0) {
      deadline = Date.now() + LIMIT_SECONDS * 1000;
      try { localStorage.setItem(timerKey, String(deadline)); } catch { /* The timer still works in memory. */ }
    }
    const update = () => {
      const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(seconds);
      if (seconds === 0 && !timeExpiredRef.current && !submittedRef.current) {
        timeExpiredRef.current = true;
        window.setTimeout(() => submitRef.current(), 0);
      }
    };
    update();
    const ready = window.setTimeout(() => setTimerReady(true), 0);
    const interval = window.setInterval(update, 1000);
    return () => { window.clearTimeout(ready); window.clearInterval(interval); };
  }, [answersReady, timerKey, timerSession, mockTest]);

  useEffect(() => {
    if (!mockTest || !answersReady || result) return;
    const timeout = window.setTimeout(() => {
      mockSaveTimeoutRef.current = null;
      if (busyRef.current || submittedRef.current) return;
      const save = (mockSavePromiseRef.current ?? Promise.resolve()).then(async () => {
        if (busyRef.current || submittedRef.current) return;
        const response = await fetch(`/api/mock-tests/${encodeURIComponent(mockTest.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers, reviewQuestionIds: reviewIds }) });
        const data = await response.json().catch(() => null) as { error?: unknown } | null;
        if (!response.ok) throw new Error(typeof data?.error === "string" ? data.error : "Your mock test progress could not be saved.");
      }).catch((reason: unknown) => {
        if (!busyRef.current && !submittedRef.current) setError(reason instanceof Error ? reason.message : "Your mock test progress could not be saved.");
      });
      mockSavePromiseRef.current = save;
      void save.finally(() => {
        if (mockSavePromiseRef.current === save) mockSavePromiseRef.current = null;
      });
    }, 350);
    mockSaveTimeoutRef.current = timeout;
    return () => {
      window.clearTimeout(timeout);
      if (mockSaveTimeoutRef.current === timeout) mockSaveTimeoutRef.current = null;
    };
  }, [answers, answersReady, mockTest, result, reviewIds]);

  useEffect(() => {
    const onFullscreen = () => { const active = Boolean(document.fullscreenElement); setNativeFullscreen(active); setFocusMode(active); };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape" && !document.fullscreenElement) setFocusMode(false); };
    document.addEventListener("fullscreenchange", onFullscreen);
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("fullscreenchange", onFullscreen); document.removeEventListener("keydown", onKeyDown); };
  }, []);

  useEffect(() => {
    if (!draggingSplit) return;
    const onPointerMove = (event: PointerEvent) => {
      const box = panesRef.current?.getBoundingClientRect();
      if (!box || !box.width) return;
      setSplitPercent(Math.min(68, Math.max(32, ((event.clientX - box.left) / box.width) * 100)));
    };
    const onPointerUp = () => setDraggingSplit(false);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => { window.removeEventListener("pointermove", onPointerMove); window.removeEventListener("pointerup", onPointerUp); };
  }, [draggingSplit]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Element && (toolbarRef.current?.contains(target) || target.closest("[data-reading-index]"))) return;
      setSelection(null);
    };
    const onSelectionChange = () => { const selected = window.getSelection(); if (!selected || selected.isCollapsed) setSelection(null); };
    const onScroll = () => setSelection(null);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("selectionchange", onSelectionChange);
    window.addEventListener("scroll", onScroll, true);
    return () => { document.removeEventListener("pointerdown", onPointerDown); document.removeEventListener("selectionchange", onSelectionChange); window.removeEventListener("scroll", onScroll, true); };
  }, []);

  async function submitAttempt() {
    if (busyRef.current || submittedRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    if (mockSaveTimeoutRef.current !== null) {
      window.clearTimeout(mockSaveTimeoutRef.current);
      mockSaveTimeoutRef.current = null;
    }
    await mockSavePromiseRef.current;
    if (!tokenRef.current) tokenRef.current = crypto.randomUUID();
    try { localStorage.setItem(tokenKey, tokenRef.current); } catch { /* The server still accepts the one-time token. */ }
    try {
      const response = await fetch(`/api/reading/articles/${article.slug}/attempts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionToken: tokenRef.current, mockTestId: mockTest?.id, answers: questions.map((question) => ({ questionId: question.id, answer: answers[question.id] ?? "" })) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "We couldn't save your answers. Please try again.");
      const submission = data as SubmissionResult;
      submittedRef.current = true;
      setSubmitted(true);
      setResult(submission);
      setAnswers({});
      setHistory((items) => [submission.attempt, ...items.filter((item) => item.id !== submission.attempt.id)].slice(0, 10));
      try { localStorage.removeItem(answerKey); localStorage.removeItem(timerKey); localStorage.removeItem(tokenKey); } catch { /* The saved result is already stored on the server. */ }
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We couldn't save your answers. Please try again.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  useEffect(() => { submitRef.current = () => { void submitAttempt(); }; });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitAttempt();
  }

  async function toggleFocus() {
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => undefined);
      setFocusMode(false);
      return;
    }
    try {
      await rootRef.current?.requestFullscreen();
    } catch {
      setFocusMode((value) => !value);
    }
  }

  function startAgain() {
    submittedRef.current = false;
    setSubmitted(false);
    busyRef.current = false;
    timeExpiredRef.current = false;
    tokenRef.current = "";
    const deadline = Date.now() + LIMIT_SECONDS * 1000;
    setAnswers({});
    setResult(null);
    setBusy(false);
    setError("");
    setRemaining(LIMIT_SECONDS);
    setTimerReady(false);
    setTimerSession((value) => value + 1);
    try { localStorage.removeItem(answerKey); localStorage.removeItem(tokenKey); localStorage.setItem(timerKey, String(deadline)); } catch { /* A new in-memory attempt can still start. */ }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function locateSelection() {
    const selected = window.getSelection();
    if (!selected || selected.isCollapsed || !selected.rangeCount) return;
    const range = selected.getRangeAt(0);
    const locate = (node: Node, offset: number) => {
      const element = node.nodeType === Node.ELEMENT_NODE ? node as HTMLElement : node.parentElement;
      const block = element?.closest<HTMLElement>("[data-reading-index]");
      if (!block || !rootRef.current?.contains(block)) return null;
      const index = Number(block.dataset.readingIndex);
      const local = document.createRange();
      try { local.selectNodeContents(block); local.setEnd(node, offset); } catch { return null; }
      return starts[index] + local.toString().length;
    };
    const start = locate(range.startContainer, range.startOffset);
    const end = locate(range.endContainer, range.endOffset);
    if (start === null || end === null) return;
    const from = Math.min(start, end);
    const to = Math.max(start, end);
    const text = canonicalText.slice(from, to);
    if (!text.trim()) return;
    const bounds = range.getBoundingClientRect();
    const placement = bounds.top > 80 || bounds.bottom + 58 > window.innerHeight ? "above" : "below";
    const halfWidth = Math.min(118, Math.max(0, window.innerWidth / 2 - 8));
    const left = Math.min(Math.max(bounds.left + bounds.width / 2, halfWidth + 8), window.innerWidth - halfWidth - 8);
    setSelection({ start: from, end: to, text, left, placement, top: placement === "above" ? Math.max(8, bounds.top - 8) : bounds.bottom + 8 });
  }

  async function saveHighlight(color: string) {
    if (!selection) return;
    setHighlightError("");
    try {
      const response = await fetch(`/api/reading/articles/${article.slug}/highlights`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ startOffset: selection.start, endOffset: selection.end, selectedText: selection.text, color }) });
      const data = await response.json();
      if (!response.ok) { setHighlightError(data.error ?? "Could not save highlight."); return; }
      setHighlights((list) => [...list, { id: data.highlight.id, selectedText: data.highlight.selectedText, startOffset: data.highlight.startOffset, endOffset: data.highlight.endOffset, color: data.highlight.color }].sort((a, b) => a.startOffset - b.startOffset));
      setSelection(null);
      window.getSelection()?.removeAllRanges();
    } catch { setHighlightError("Could not save highlight. Check your connection and try again."); }
  }

  async function removeHighlight(id: string) {
    const response = await fetch(`/api/reading/highlights/${id}`, { method: "DELETE" });
    if (response.ok) setHighlights((items) => items.filter((item) => item.id !== id));
    else setHighlightError("Could not remove this highlight. Please try again.");
  }

  const formattedTime = `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;
  const fallbackFocus = focusMode && !nativeFullscreen;

  return <main ref={rootRef} className={`reading-practice-root fixed inset-0 z-10 flex h-dvh min-h-0 flex-col overflow-hidden bg-background text-foreground ${fallbackFocus ? "z-50" : ""}`}>
    <header className="relative z-30 flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-3 sm:px-5">
      <div className="flex min-w-0 items-center gap-2 sm:gap-4"><Link href="/dashboard/reading" aria-label="Back to Reading Lab" className="grid size-10 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"><ArrowLeft size={18} /></Link><span className="hidden truncate text-sm font-semibold sm:block">Reading Lab</span><button type="button" onClick={() => void toggleFocus()} className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-semibold transition hover:bg-muted sm:px-3"><Focus size={14} />{focusMode ? "Exit focus" : "Focus"}</button></div>
      <div aria-live="polite" className={`absolute left-1/2 flex -translate-x-1/2 items-center gap-1.5 text-sm font-bold tabular-nums ${remaining < 60 ? "text-destructive" : "text-foreground"}`}><Clock3 size={15} />{result ? "Complete" : formattedTime}</div>
      <div className="flex shrink-0 items-center gap-2"><span className="hidden text-xs text-muted-foreground sm:inline">Passage 1 · {questions.length} questions</span><div role="group" aria-label="Passage text size" className="flex h-9 items-center gap-0.5 rounded-full border border-border bg-background p-1"><button type="button" onClick={() => setPassageFontSize((size) => Math.max(14, size - 1))} disabled={passageFontSize <= 14} aria-label="Decrease passage text size" title="Decrease text size" className="grid size-7 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"><Minus size={14}/></button><span aria-hidden="true" title={`${passageFontSize}px`} className="grid size-7 place-items-center rounded-full bg-muted text-sm font-medium text-foreground">A</span><span className="sr-only" aria-live="polite">Passage text size: {passageFontSize} pixels</span><button type="button" onClick={() => setPassageFontSize((size) => Math.min(28, size + 1))} disabled={passageFontSize >= 28} aria-label="Increase passage text size" title="Increase text size" className="grid size-7 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"><Plus size={14}/></button></div><button type="button" onClick={() => void toggleFocus()} aria-label={focusMode ? "Exit fullscreen" : "Enter fullscreen"} className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted lg:hidden">{focusMode ? <Minimize2 size={17} /> : <Expand size={17} />}</button></div>
    </header>

    <section className="flex min-h-[52px] shrink-0 flex-col justify-center gap-0.5 border-b border-border bg-card px-4 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="flex min-w-0 items-center gap-2"><span className="text-sm font-bold">{mockTest ? "Reading mock" : "Part 1"}</span><span className="hidden rounded-md bg-secondary px-2 py-1 text-[11px] font-semibold text-secondary-foreground sm:inline">{mockTest ? "Timed single section" : "IELTS Academic Reading"}</span><span className="truncate text-xs text-muted-foreground sm:text-sm">{article.title}</span></div>
      <p className="text-xs text-muted-foreground">Read the text and answer questions {questionRange}</p>
    </section>

    <div className="grid h-11 shrink-0 grid-cols-2 border-b border-border bg-muted lg:hidden" role="tablist" aria-label="Practice test panes">
      <button type="button" role="tab" aria-selected={mobilePane === "passage"} onClick={() => setMobilePane("passage")} className={`text-sm font-semibold ${mobilePane === "passage" ? "border-b-2 border-primary bg-card text-foreground" : "text-muted-foreground"}`}>Passage</button>
      <button type="button" role="tab" aria-selected={mobilePane === "questions"} onClick={() => setMobilePane("questions")} className={`text-sm font-semibold ${mobilePane === "questions" ? "border-b-2 border-primary bg-card text-foreground" : "text-muted-foreground"}`}>Questions {answeredCount > 0 && <span className="text-xs text-muted-foreground">· {answeredCount}/{questions.length}</span>}</button>
    </div>

    <div ref={panesRef} className="reading-test-panes grid min-h-0 flex-1 grid-cols-1" style={{ "--reading-split": `${splitPercent}%` } as React.CSSProperties}>
      <section aria-label="Reading passage" onMouseUp={locateSelection} onTouchEnd={() => window.setTimeout(locateSelection, 0)} className={`min-h-0 overflow-y-auto overscroll-contain px-4 pb-10 pt-5 sm:px-5 lg:px-6 ${mobilePane === "passage" ? "flex" : "hidden lg:flex"} flex-col`}>
        <p className="mb-6 text-sm italic leading-6 text-muted-foreground">You should spend about 20 minutes on Questions {questionRange}, which are based on Reading Passage 1 below.</p>
        <article style={{ fontSize: `${passageFontSize}px` }} className="mx-auto w-full max-w-[760px] select-text leading-[1.9]">
          <h1 className="mb-6 text-lg font-bold leading-7 text-foreground">{article.title}</h1>
          {blocks.map((block, index) => <PassageBlock key={index} block={block} index={index} start={starts[index]} highlights={highlights} onRemove={(id) => void removeHighlight(id)} fontSize={passageFontSize} label={block.type === "paragraph" ? String.fromCharCode(65 + blocks.slice(0, index).filter((item) => item.type === "paragraph").length) : null} />)}
        </article>
        {highlightError && <p role="alert" className="mx-auto mt-4 max-w-[760px] text-sm text-destructive">{highlightError}</p>}
      </section>

      <button type="button" role="separator" aria-orientation="vertical" aria-label="Resize passage and questions" aria-valuenow={splitPercent} onPointerDown={(event) => { event.preventDefault(); setDraggingSplit(true); }} onKeyDown={(event) => { if (event.key === "ArrowLeft") setSplitPercent((value) => Math.max(32, value - 3)); if (event.key === "ArrowRight") setSplitPercent((value) => Math.min(68, value + 3)); }} className="group relative hidden cursor-col-resize touch-none place-items-center bg-border transition-colors hover:bg-primary/50 focus-visible:bg-primary lg:grid"><span className="grid h-10 w-5 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-sm group-hover:text-primary"><span aria-hidden="true" className="text-xs">↔</span></span></button>

      <section aria-label="Test questions" className={`min-h-0 overflow-y-auto overscroll-contain border-border bg-card ${mobilePane === "questions" ? "flex" : "hidden lg:flex"} flex-col lg:border-l-0`}>
        {result ? <div className="mx-auto w-full max-w-3xl p-4 sm:p-6"><ResultView result={result} articleSlug={article.slug} onRetake={startAgain} allowRetake={!mockTest} /><AttemptHistory history={history} /></div> : <form onSubmit={handleSubmit} className="flex min-h-full flex-col">
          <div className="sticky top-0 z-10 flex min-h-[58px] shrink-0 items-center justify-between gap-3 border-b border-border bg-card/95 px-4 backdrop-blur sm:px-6"><div><h2 className="text-base font-semibold">Questions {questionRange}</h2><p className="text-xs text-muted-foreground">Select or type one answer for each question.</p></div><span className="text-xs font-semibold tabular-nums text-muted-foreground">{answeredCount}/{questions.length}</span></div>
          <nav aria-label="Question navigation" className="mx-auto flex w-full max-w-3xl flex-wrap gap-2 border-b border-border px-4 py-3 sm:px-6">{questions.map((question, index) => <button key={question.id} type="button" aria-label={`Go to question ${index + 1}${reviewIds.includes(question.id) ? ", marked for review" : ""}`} onClick={() => document.getElementById(`reading-question-${question.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })} className={`grid size-9 place-items-center rounded-lg border text-xs font-semibold ${reviewIds.includes(question.id) ? "border-amber-500 bg-amber-500/10" : "border-border"} ${answers[question.id] ? "text-foreground" : "text-muted-foreground"}`}>{index + 1}</button>)}</nav>
          <ol className="mx-auto w-full max-w-3xl flex-1 divide-y divide-border">
            {questions.map((question, index) => <QuestionView key={question.id} question={question} number={index + 1} value={answers[question.id] ?? ""} onChange={(value) => setAnswers((current) => ({ ...current, [question.id]: value }))} disabled={busy || (timerReady && remaining === 0)} marked={reviewIds.includes(question.id)} onToggleReview={() => setReviewIds((ids) => ids.includes(question.id) ? ids.filter((id) => id !== question.id) : [...ids, question.id])} onGoToPassage={() => setMobilePane("passage")} />)}
          </ol>
          {error && <p role="alert" className="mx-4 mt-3 rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-xs leading-5 text-destructive sm:mx-6">{error} Your answers are still saved in this browser. Select “Submit answers” to retry.</p>}
          {timerReady && remaining === 0 && !result && <p role="status" className="mx-4 mt-3 text-xs font-semibold text-destructive sm:mx-6">Time is up. Your answers are being submitted.</p>}
          <div className="sticky bottom-0 mt-auto flex shrink-0 flex-col gap-2 border-t border-border bg-card/95 p-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4"><p className="text-xs text-muted-foreground">Unanswered questions count as incorrect.</p><button type="submit" disabled={busy || submitted} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-wait disabled:opacity-65 sm:w-auto">{busy ? "Checking answers…" : "Submit answers"}<ArrowRight size={16} /></button></div>
        </form>}
      </section>
    </div>

    {selection && <div ref={toolbarRef} role="toolbar" aria-label="Highlight selected passage text" className="fixed z-[60] flex -translate-x-1/2 items-center gap-0.5 rounded-xl border border-border bg-card p-1 shadow-[0_12px_30px_-12px_rgba(12,14,22,.45)]" style={{ top: selection.top, left: selection.left, transform: selection.placement === "above" ? "translate(-50%, -100%)" : "translate(-50%, 0)" }}>
      {colors.map((color) => <button key={color.value} type="button" title={`Highlight ${color.label}`} aria-label={`Highlight ${color.label}`} onMouseDown={(event) => event.preventDefault()} onClick={() => void saveHighlight(color.value)} className={`grid size-9 place-items-center rounded-lg hover:bg-secondary ${color.ink}`}><Highlighter size={17} /></button>)}
      <span className="mx-0.5 h-6 w-px bg-border" />
      <button type="button" title="Remove overlapping highlights" aria-label="Remove overlapping highlights" onMouseDown={(event) => event.preventDefault()} onClick={() => { const affected = highlights.filter((item) => item.startOffset < selection.end && item.endOffset > selection.start); void Promise.all(affected.map((item) => removeHighlight(item.id))); }} className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><RotateCcw size={16} /></button>
    </div>}
  </main>;
}

function QuestionView({ question, number, value, onChange, disabled, marked, onToggleReview, onGoToPassage }: { question: Question; number: number; value: string; onChange(value: string): void; disabled: boolean; marked: boolean; onToggleReview(): void; onGoToPassage(): void }) {
  const isTextAnswer = textAnswerTypes.includes(question.type);
  return <li id={`reading-question-${question.id}`} className={`min-w-0 scroll-mt-20 px-4 py-4 sm:px-6 sm:py-5 ${marked ? "bg-amber-500/5" : ""}`}>
    <div className="mb-2 flex flex-wrap items-center gap-2"><span className="grid size-6 shrink-0 place-items-center rounded border border-border text-xs font-bold tabular-nums">{number}</span><span className="rounded-md bg-secondary px-2 py-1 text-[10px] font-semibold text-secondary-foreground">{typeLabels[question.type]}</span></div>
    <button type="button" disabled={disabled} aria-pressed={marked} onClick={onToggleReview} className="mb-2 min-h-8 rounded-md border border-border px-2 text-xs font-semibold disabled:opacity-50">{marked ? "Marked for review" : "Mark for review"}</button>
    {question.type === "MATCHING_HEADINGS" && question.passageLabel && <button type="button" onClick={onGoToPassage} className="mb-2 inline-flex min-h-8 items-center gap-1 rounded-md border border-border px-2 text-xs font-semibold text-secondary-foreground hover:bg-secondary">Paragraph {question.passageLabel} in passage <ArrowLeft size={12} className="rotate-180" /></button>}
    <fieldset disabled={disabled} className="min-w-0">
      <legend className="mb-3 text-sm font-medium leading-6">{question.prompt}</legend>
      {question.type === "DIAGRAM_LABEL_COMPLETION" && <DiagramNodes nodes={question.options} />}
      {isTextAnswer ? <label className="grid max-w-xl gap-1.5 text-xs font-semibold text-muted-foreground"><span className="sr-only">Answer to question {number}</span><input value={value} onChange={(event) => onChange(event.target.value)} maxLength={240} autoComplete="off" className="min-h-10 rounded-lg border border-input bg-background px-3 text-sm font-normal text-foreground outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20 disabled:opacity-60" placeholder={question.type === "SHORT_ANSWER" ? "Your answer" : "Complete the gap"} /></label> : <div className={`grid gap-x-4 gap-y-1.5 ${question.type === "MATCHING_INFORMATION" ? "sm:grid-cols-2" : "sm:grid-cols-2"}`}>{question.options.map((option) => <label key={option.id} className={`flex min-h-9 cursor-pointer items-start gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors focus-within:ring-2 focus-within:ring-ring/30 ${value === option.id ? "bg-secondary text-secondary-foreground" : "hover:bg-muted"}`}><input type="radio" name={`question-${question.id}`} value={option.id} checked={value === option.id} onChange={() => onChange(option.id)} className="mt-0.5 size-4 shrink-0 accent-[var(--primary)]" /><span className="leading-5">{option.text}</span></label>)}</div>}
    </fieldset>
  </li>;
}

function DiagramNodes({ nodes }: { nodes: Option[] }) {
  return <div aria-label="Diagram from the passage" className="mb-3 flex flex-col items-stretch gap-1.5 rounded-xl bg-muted/70 p-3 sm:flex-row sm:items-center sm:gap-2">
    {nodes.map((node, index) => <span key={node.id} className="contents"><span className="flex min-h-10 flex-1 items-center justify-center rounded-lg border border-border bg-card px-2.5 py-2 text-center text-xs font-medium leading-5 text-foreground">{node.text}</span>{index < nodes.length - 1 && <ArrowDown aria-hidden="true" size={14} className="mx-auto shrink-0 text-muted-foreground sm:rotate-[-90deg]" />}</span>)}
    <span className="flex min-h-10 flex-1 items-center justify-center rounded-lg border border-dashed border-primary/60 bg-card px-2 text-xs font-semibold text-secondary-foreground">Your label</span>
  </div>;
}

function ResultView({ result, articleSlug, onRetake, allowRetake }: { result: SubmissionResult; articleSlug: string; onRetake(): void; allowRetake: boolean }) {
  const percentage = Math.round((result.attempt.score / result.attempt.questionCount) * 100);
  return <section aria-labelledby="result-heading" className="mb-8">
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6"><p className="eyebrow">Test complete</p><div className="mt-2 flex flex-wrap items-end justify-between gap-4"><div><h2 id="result-heading" className="text-xl font-semibold">Your result</h2><p className="mt-1 text-sm text-muted-foreground">{result.attempt.answeredCount} of {result.attempt.questionCount} answered</p></div><div className="flex items-baseline gap-2"><span className="text-4xl font-semibold tabular-nums">{result.attempt.score}<span className="text-xl text-muted-foreground">/{result.attempt.questionCount}</span></span><span className="text-sm font-semibold text-secondary-foreground">{percentage}%</span></div></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${percentage}%` }} /></div></div>
    <h3 className="mb-2 mt-6 text-base font-semibold">Review your answers</h3>
    <ol className="divide-y divide-border rounded-2xl border border-border bg-card">{result.answers.map((answer, index) => <li key={answer.questionId} className="flex items-start gap-3 p-4"><span className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full ${answer.isCorrect ? "bg-accent text-accent-foreground" : "bg-destructive/10 text-destructive"}`}>{answer.isCorrect ? <Check size={14} /> : <X size={14} />}</span><div className="min-w-0 flex-1"><p className="text-sm font-semibold leading-5">{index + 1}. {answer.prompt}</p><p className="mt-1.5 text-xs leading-5 text-muted-foreground">Your answer: <span className="font-medium text-foreground">{displayAnswer(answer.answer, answer.options) || "Not answered"}</span></p>{!answer.isCorrect && <p className="mt-1 text-xs leading-5 text-muted-foreground">Correct answer: <span className="font-semibold text-foreground">{answer.correctAnswer}</span></p>}<p className="mt-1.5 text-xs leading-5 text-muted-foreground">{answer.explanation}</p><Link href={`/dashboard/reading/${articleSlug}#passage-block-${answer.evidenceBlockIndex}`} className="mt-1 inline-flex min-h-8 items-center gap-1.5 text-xs font-semibold text-secondary-foreground hover:underline"><ExternalLink size={13} />Review in passage</Link></div></li>)}</ol>
    {allowRetake ? <button type="button" onClick={onRetake} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-semibold hover:bg-muted"><RotateCcw size={15} />Try again</button> : <Link href="/dashboard/mock-tests" className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-semibold hover:bg-muted">Back to mock tests<ArrowRight size={15}/></Link>}
  </section>;
}

function AttemptHistory({ history }: { history: AttemptSummary[] }) {
  return <section aria-labelledby="attempt-history-heading" className="mt-6"><div className="flex items-end justify-between gap-3"><div><p className="eyebrow">Your progress</p><h2 id="attempt-history-heading" className="mt-1 text-base font-semibold">Attempt history</h2></div><span className="text-xs text-muted-foreground">{history.length} saved</span></div>{history.length ? <ol className="mt-2 divide-y divide-border rounded-xl border border-border bg-card">{history.map((attempt) => <li key={attempt.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-3 text-xs"><span className="font-medium">Completed</span><span className="ml-auto font-semibold tabular-nums">{attempt.score}/{attempt.questionCount}<span className="ml-1.5 font-normal text-muted-foreground">· {attempt.answeredCount} answered</span></span><time dateTime={attempt.submittedAt} className="w-full text-muted-foreground sm:w-auto sm:text-right">{new Date(attempt.submittedAt).toISOString().replace("T", " ").slice(0, 16)} UTC</time></li>)}</ol> : <p className="mt-2 rounded-xl border border-dashed border-border bg-card p-3 text-xs leading-5 text-muted-foreground">Your submitted attempts will appear here.</p>}</section>;
}

function displayAnswer(answer: string, options: Option[]) {
  if (!answer) return "";
  return options.find((option) => option.id === answer)?.text ?? answer;
}

function PassageBlock({ block, index, start, highlights, onRemove, fontSize, label }: { block: ArticleBlock; index: number; start: number; highlights: ReaderHighlight[]; onRemove(id: string): void; fontSize: number; label: string | null }) {
  const end = start + block.text.length;
  const relevant = highlights.filter((item) => item.startOffset < end && item.endOffset > start);
  const boundaries = new Set<number>([0, block.text.length]);
  relevant.forEach((item) => { boundaries.add(Math.max(0, item.startOffset - start)); boundaries.add(Math.min(block.text.length, item.endOffset - start)); });
  const points = [...boundaries].sort((a, b) => a - b);
  const parts = points.slice(0, -1).map((from, partIndex) => { const to = points[partIndex + 1]; const owners = relevant.filter((item) => item.startOffset < start + to && item.endOffset > start + from); return { from, to, owners }; });
  const Tag = block.type === "heading" ? "h2" : "p";
  return <div id={label ? `passage-paragraph-${label}` : undefined} className={block.type === "heading" ? "relative" : "relative pl-8 sm:pl-10"}>
    {label && <span aria-hidden="true" className="absolute left-0 top-1 grid size-6 place-items-center rounded-md border border-border bg-muted text-[11px] font-semibold text-muted-foreground">{label}</span>}
    <Tag id={`passage-block-${index}`} data-reading-index={index} style={block.type === "heading" ? { fontSize: `${fontSize}px` } : undefined} className={block.type === "heading" ? "scroll-mt-20 mb-3 mt-7 font-bold leading-7 first:mt-0" : "scroll-mt-20 mb-5 last:mb-0"}>{parts.map(({ from, to, owners }) => owners.length ? <mark key={`${from}-${to}`} onClick={() => onRemove(owners[0].id)} title="Click to remove this highlight" className={`rounded-sm ${colors.find((color) => color.value === owners[owners.length - 1].color)?.cls ?? "highlight-yellow"} cursor-pointer`}>{block.text.slice(from, to)}</mark> : <span key={`${from}-${to}`}>{block.text.slice(from, to)}</span>)}</Tag>
  </div>;
}
