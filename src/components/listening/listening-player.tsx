"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, CirclePlay, FastForward, Pause, Play, RotateCcw, RotateCw, Volume2 } from "lucide-react";
import { formatAudioTime, type ListeningMaterial, type ListeningQuestionPrompt } from "@/lib/listening/content";

type Grade = { score: number; questionCount: number; attemptSaved: boolean; answers: { id: string; selected: string; correct: string; isCorrect: boolean; explanation: string; prompt: string }[]; submittedAt?: string };
type HistoryItem = { id: string; score: number; questionCount: number; submittedAt: string };
const LIMIT_SECONDS = 20 * 60;

export function ListeningPlayer({ material, mockTest }: { material: Omit<ListeningMaterial, "questions"> & { questions: ListeningQuestionPrompt[] }; mockTest?: { id: string; deadlineAt: string; answers: Record<string, string>; reviewQuestionIds: string[] } }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const lastExamTime = useRef(0);
  const [mode, setMode] = useState<"study" | "exam">(mockTest ? "exam" : "study");
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [showTranscript, setShowTranscript] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [grade, setGrade] = useState<Grade | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [remaining, setRemaining] = useState(LIMIT_SECONDS);
  const [ready, setReady] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [review, setReview] = useState<string[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [sessionKey, setSessionKey] = useState(0);
  const tokenRef = useRef("");
  const savingRef = useRef(false);
  const submitRef = useRef<() => void>(() => undefined);
  const submittedRef = useRef(false);
  const mockSaveTimeoutRef = useRef<number | null>(null);
  const mockSavePromiseRef = useRef<Promise<void> | null>(null);
  const answerKey = `bandwise-listening-draft:${material.slug}${mockTest ? `:mock:${mockTest.id}` : ""}`;
  const deadlineKey = `bandwise-listening-deadline:${material.slug}${mockTest ? `:mock:${mockTest.id}` : ""}`;
  const tokenKey = `bandwise-listening-token:${material.slug}${mockTest ? `:mock:${mockTest.id}` : ""}`;

  useEffect(() => {
    let deadline = 0;
    let restored: Record<string, string> = mockTest?.answers ?? {};
    const restoredReview = mockTest?.reviewQuestionIds ?? [];
    try {
      const draft = JSON.parse(localStorage.getItem(answerKey) || "null") as unknown;
      if (draft && typeof draft === "object" && !Array.isArray(draft)) {
        restored = Object.fromEntries(Object.entries(draft).filter(([id, value]) => material.questions.some((question) => question.id === id && typeof value === "string" && question.options.includes(value as string))));
      }
      tokenRef.current = localStorage.getItem(tokenKey) || "";
      deadline = mockTest ? new Date(mockTest.deadlineAt).getTime() : Number(localStorage.getItem(deadlineKey));
    } catch { /* Start a clean in-memory attempt when browser storage is unavailable. */ }
    if (!Number.isFinite(deadline) || deadline <= 0) deadline = Date.now() + LIMIT_SECONDS * 1000;
    try { localStorage.setItem(deadlineKey, String(deadline)); } catch { /* Timer continues for this page view. */ }
    const refresh = () => setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    const restoreTimer = window.setTimeout(() => { setAnswers(restored); setReview(restoredReview); refresh(); setReady(true); }, 0);
    const interval = window.setInterval(refresh, 1000);
    void fetch(`/api/listening/${material.slug}/attempts`).then((response) => response.ok ? response.json() : null).then((data) => { if (Array.isArray(data?.history)) setHistory(data.history); }).catch(() => undefined);
    return () => { window.clearTimeout(restoreTimer); window.clearInterval(interval); };
  }, [answerKey, deadlineKey, material.slug, material.questions, tokenKey, sessionKey, mockTest]);

  useEffect(() => {
    if (ready && !grade) { try { localStorage.setItem(answerKey, JSON.stringify(answers)); } catch { /* Answers remain available for this page view. */ } }
  }, [answerKey, answers, grade, ready]);
  useEffect(() => {
    if (!mockTest || !ready || grade) return;
    const timeout = window.setTimeout(() => {
      mockSaveTimeoutRef.current = null;
      if (savingRef.current || submittedRef.current) return;
      const save = (mockSavePromiseRef.current ?? Promise.resolve()).then(async () => {
        if (savingRef.current || submittedRef.current) return;
        const response = await fetch(`/api/mock-tests/${encodeURIComponent(mockTest.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers, reviewQuestionIds: review }) });
        const data = await response.json().catch(() => null) as { error?: unknown } | null;
        if (!response.ok) throw new Error(typeof data?.error === "string" ? data.error : "Your mock test progress could not be saved.");
      }).catch((reason: unknown) => {
        if (!savingRef.current && !submittedRef.current) setError(reason instanceof Error ? reason.message : "Your mock test progress could not be saved.");
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
  }, [answers, grade, mockTest, ready, review]);
  useEffect(() => { submitRef.current = () => { void submitAnswers(true); }; });
  useEffect(() => { if (ready && remaining === 0 && !grade && !submittedRef.current) submitRef.current(); }, [ready, remaining, grade]);
  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => { if (!grade && Object.keys(answers).length) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [answers, grade]);

  const activeCue = useMemo(() => {
    let index = material.cues.findIndex((cue) => time >= cue.start && time < cue.end);
    if (index < 0 && time >= (material.cues.at(-1)?.end ?? Infinity)) index = material.cues.length - 1;
    return index;
  }, [material.cues, time]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (Number.isFinite(audio.duration)) setDuration(audio.duration);
    const updateTime = () => { setTime(audio.currentTime); if (mode === "exam") lastExamTime.current = audio.currentTime; };
    const updateDuration = () => setDuration(audio.duration || 0);
    const finish = () => setPlaying(false);
    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("durationchange", updateDuration);
    audio.addEventListener("ended", finish);
    return () => { audio.removeEventListener("timeupdate", updateTime); audio.removeEventListener("loadedmetadata", updateDuration); audio.removeEventListener("durationchange", updateDuration); audio.removeEventListener("ended", finish); };
  }, [mode]);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) { void audio.play().then(() => setPlaying(true)).catch(() => setError("Audio could not be played. Please try again.")); }
    else { audio.pause(); setPlaying(false); }
  }
  function seekTo(value: number) { if (mode === "exam" || !audioRef.current) return; audioRef.current.currentTime = Math.max(0, Math.min(value, duration)); setTime(Math.max(0, Math.min(value, duration))); }
  function changeMode(next: "study" | "exam") {
    if (next === mode) return;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; setPlaying(false); }
    lastExamTime.current = 0; setTime(0); setError(""); setMode(next); setShowTranscript(next === "study");
  }
  function setAnswer(questionId: string, value: string) { if (!grade) setAnswers((current) => ({ ...current, [questionId]: value })); }
  async function submitAnswers(automatic = false) {
    if (savingRef.current || submittedRef.current || grade) return;
    savingRef.current = true; setSaving(true); setError("");
    if (mockSaveTimeoutRef.current !== null) {
      window.clearTimeout(mockSaveTimeoutRef.current);
      mockSaveTimeoutRef.current = null;
    }
    await mockSavePromiseRef.current;
    if (!tokenRef.current) tokenRef.current = crypto.randomUUID();
    try { localStorage.setItem(tokenKey, tokenRef.current); } catch { /* Server token still protects the request. */ }
    try {
      const completeAnswers = Object.fromEntries(material.questions.map((question) => [question.id, answers[question.id] || ""]));
      const response = await fetch(`/api/listening/${material.slug}/attempts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers: completeAnswers, submissionToken: tokenRef.current, mockTestId: mockTest?.id }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Answers could not be checked. Please try again.");
      submittedRef.current = true; setGrade(data); setAnswers(completeAnswers);
      try { localStorage.removeItem(answerKey); localStorage.removeItem(deadlineKey); localStorage.removeItem(tokenKey); } catch { /* Result has been recorded. */ }
      if (data.submittedAt) setHistory((items) => [{ id: tokenRef.current, score: data.score, questionCount: data.questionCount, submittedAt: data.submittedAt }, ...items].slice(0, 10));
      if (automatic) setError("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Answers could not be checked. Please try again."); }
    finally { savingRef.current = false; setSaving(false); }
  }
  const answeredCount = Object.values(answers).filter(Boolean).length;
  function startAgain() {
    submittedRef.current = false; savingRef.current = false; tokenRef.current = "";
    setGrade(null); setAnswers({}); setReview([]); setError(""); setSaving(false); setQuestionIndex(0); setRemaining(LIMIT_SECONDS); setPlaying(false); setTime(0);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    try { localStorage.removeItem(answerKey); localStorage.removeItem(tokenKey); localStorage.setItem(deadlineKey, String(Date.now() + LIMIT_SECONDS * 1000)); } catch { /* Fresh attempt continues in memory. */ }
    setSessionKey((value) => value + 1);
  }

  return <main className="min-h-screen bg-background"><header className="border-b border-border bg-card"><div className="page-shell flex h-[68px] items-center justify-between gap-3"><Link href="/dashboard/listening" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft size={17}/>Listening Lab</Link><span className="hidden text-sm font-medium text-muted-foreground sm:inline">IELTS Listening practice</span></div></header><div className="page-shell max-w-5xl py-8 sm:py-12">
    <p className="eyebrow">{material.category} · {material.difficulty.replaceAll("_", " ").toLowerCase()}</p><h1 className="display-font mt-3 text-3xl tracking-[-.035em] sm:text-4xl">{material.title}</h1><p className="mt-3 max-w-2xl leading-7 text-muted-foreground">{material.description}</p>
    <div className="mt-7 flex flex-wrap items-center gap-3">{mockTest ? <span className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold"><CirclePlay size={15} className="text-primary"/>Listening mock · one section</span> : <div className="inline-flex rounded-xl border border-border bg-card p-1" role="group" aria-label="Listening mode"><button onClick={() => changeMode("study")} aria-pressed={mode === "study"} className={`min-h-11 rounded-lg px-4 text-sm font-semibold transition ${mode === "study" ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground"}`}>Study mode</button><button onClick={() => changeMode("exam")} aria-pressed={mode === "exam"} className={`min-h-11 rounded-lg px-4 text-sm font-semibold transition ${mode === "exam" ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground"}`}>Exam mode</button></div>}<span aria-live="polite" className={`rounded-xl border border-border bg-card px-4 py-3 font-mono text-sm font-bold tabular-nums ${remaining < 60 ? "text-destructive" : ""}`}>Time left {String(Math.floor(remaining / 60)).padStart(2, "0")}:{String(remaining % 60).padStart(2, "0")}</span>{!ready && <span className="text-xs text-muted-foreground">Restoring saved answers…</span>}</div>
    <section aria-label="Audio player" className="mt-5 rounded-2xl border border-border bg-card p-5 sm:p-7"><audio ref={audioRef} src={material.audioUrl} preload="metadata" onSeeking={(event) => { if (mode === "exam" && event.currentTarget.currentTime < lastExamTime.current) event.currentTarget.currentTime = lastExamTime.current; }} onRateChange={(event) => setSpeed(event.currentTarget.playbackRate)} onError={() => setError("The audio file could not be loaded. Refresh the page and try again.")}></audio><div className="flex items-center gap-4"><button onClick={togglePlay} aria-label={playing ? "Pause audio" : "Play audio"} className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition hover:bg-primary/90 sm:size-14">{playing ? <Pause size={21} fill="currentColor"/> : <Play size={21} fill="currentColor" className="ml-0.5"/>}</button><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{material.title}</p><div className="mt-2 flex items-center gap-3"><span className="w-10 text-right font-mono text-xs text-muted-foreground">{formatAudioTime(time)}</span><input aria-label="Audio position" type="range" min={0} max={duration || 1} step={0.1} disabled={mode === "exam" || !duration} value={Math.min(time, duration || 1)} onChange={(event) => seekTo(Number(event.target.value))} className="h-2 min-w-0 flex-1 cursor-pointer accent-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60"/><span className="w-10 font-mono text-xs text-muted-foreground">{formatAudioTime(duration)}</span></div></div></div><div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4"><div className="flex items-center gap-2"><button disabled={mode === "exam"} onClick={() => seekTo(time - 10)} aria-label="Rewind 10 seconds" title={mode === "exam" ? "Rewind is unavailable in Exam mode" : "Rewind 10 seconds"} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-45"><RotateCcw size={15}/>10s</button><button onClick={() => seekTo(time + 10)} disabled={mode === "exam"} aria-label="Forward 10 seconds" title={mode === "exam" ? "Seeking is unavailable in Exam mode" : "Forward 10 seconds"} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-45"><RotateCw size={15}/>10s</button></div><label className="inline-flex items-center gap-2 text-sm font-medium"><Volume2 size={16} className="text-muted-foreground"/><span className="sr-only">Playback speed</span><select value={speed} onChange={(event) => { const next = Number(event.target.value); if (audioRef.current) audioRef.current.playbackRate = next; setSpeed(next); }} className="h-11 rounded-lg border border-border bg-background px-3"><option value={0.75}>0.75×</option><option value={1}>1×</option><option value={1.25}>1.25×</option><option value={1.5}>1.5×</option><option value={2}>2×</option></select></label></div></section>
    {mode === "study" && <section aria-label="Audio transcript" className="mt-5 rounded-2xl border border-border bg-card p-5 sm:p-7"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Transcript</h2><p className="mt-1 text-sm text-muted-foreground">Select a line to jump to that part of the recording.</p></div><button onClick={() => setShowTranscript((value) => !value)} aria-expanded={showTranscript} className="min-h-11 rounded-lg border border-border px-3 text-sm font-semibold">{showTranscript ? "Hide transcript" : "Show transcript"}</button></div>{showTranscript && <div className="mt-4 grid gap-1">{material.cues.map((cue, index) => <button key={cue.start} aria-current={index === activeCue ? "true" : undefined} onClick={() => seekTo(cue.start)} className={`grid min-h-12 grid-cols-[3.5rem_1fr] gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-secondary ${index === activeCue ? "bg-secondary text-secondary-foreground" : "text-foreground"}`}><span className="pt-0.5 font-mono text-xs text-muted-foreground">{formatAudioTime(cue.start)}</span><span className="text-sm leading-6">{cue.text}</span></button>)}</div>}</section>}
    {mode === "exam" && <p className="mt-5 rounded-xl border border-accent/60 bg-accent/40 p-4 text-sm leading-6 text-muted-foreground"><CirclePlay size={16} className="mr-2 inline-block align-[-3px] text-accent-foreground"/>Exam mode hides the transcript and locks rewind and seeking. You can still pause, change the volume or adjust playback speed.</p>}
    <section aria-labelledby="question-heading" className="mt-8"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="eyebrow">Check your understanding</p><h2 id="question-heading" className="mt-2 text-2xl font-semibold tracking-[-.03em]">Listening questions</h2></div><span className="text-sm text-muted-foreground">{answeredCount} of {material.questions.length} answered</span></div><nav aria-label="Question navigation" className="mt-4 flex flex-wrap gap-2">{material.questions.map((question, index) => <button key={question.id} aria-label={`Go to question ${index + 1}${review.includes(question.id) ? ", marked for review" : ""}`} aria-current={questionIndex === index ? "step" : undefined} onClick={() => { setQuestionIndex(index); document.getElementById(`listening-${question.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }); }} className={`grid size-10 place-items-center rounded-lg border text-sm font-semibold ${questionIndex === index ? "border-primary bg-secondary" : "border-border"} ${answers[question.id] ? "text-foreground" : "text-muted-foreground"}`}>{index + 1}</button>)}</nav><div className="mt-4 grid gap-4">{material.questions.map((question, index) => { const result = grade?.answers.find((item) => item.id === question.id); return <fieldset id={`listening-${question.id}`} key={question.id} disabled={Boolean(grade) || saving} onFocus={() => setQuestionIndex(index)} className={`scroll-mt-6 rounded-2xl border bg-card p-5 sm:p-6 ${review.includes(question.id) ? "border-amber-500" : "border-border"}`}><legend className="px-1 text-base font-semibold"><span className="mr-2 text-sm text-muted-foreground">{index + 1}.</span>{question.prompt}</legend><div className="mt-2"><button type="button" aria-pressed={review.includes(question.id)} onClick={() => setReview((items) => items.includes(question.id) ? items.filter((id) => id !== question.id) : [...items, question.id])} className="min-h-9 rounded-lg border border-border px-3 text-xs font-semibold">{review.includes(question.id) ? "Marked for review" : "Mark for review"}</button></div><div className="mt-3 grid gap-2 sm:grid-cols-3">{question.options.map((option) => { const selected = answers[question.id] === option; const correctChoice = result?.correct === option; return <label key={option} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${correctChoice ? "border-green-600/50 bg-green-500/10" : selected && result && !result.isCorrect ? "border-destructive/50 bg-destructive/10" : selected ? "border-primary bg-secondary" : "border-border hover:bg-muted"}`}><input type="radio" name={question.id} value={option} checked={selected} onChange={() => setAnswer(question.id, option)} className="accent-[var(--primary)]"/><span>{option}</span>{result && correctChoice && <CheckCircle2 size={15} className="ml-auto text-green-700"/>}</label>; })}</div>{result && <div className="mt-3 rounded-lg bg-background p-3 text-sm leading-6"><strong>{result.isCorrect ? "Correct." : `Not quite. Correct answer: ${result.correct}.`}</strong> {result.explanation}</div>}</fieldset>; })}</div>
      {remaining === 0 && !grade && <p role="status" className="mt-3 text-sm font-semibold text-destructive">Time is up. Your answers are being submitted automatically.</p>}{error && <p role="alert" className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</p>}{grade && <div role="status" className="mt-5 rounded-2xl border border-primary/30 bg-secondary p-5"><p className="text-sm font-semibold">{mockTest ? "Mock test complete" : "Your result"}</p><p className="display-font mt-1 text-3xl">{grade.score} / {grade.questionCount}</p><p className="mt-1 text-sm text-muted-foreground">{grade.score === grade.questionCount ? "Excellent listening — you got every answer right." : "Review the explanations above, then give it another listen."}</p><p className="mt-2 text-xs text-muted-foreground">{grade.attemptSaved ? "Attempt saved to your learning history." : "Result calculated. Your attempt could not be saved to your learning history."}</p>{mockTest ? <Link href="/dashboard/mock-tests" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-card px-3.5 text-sm font-semibold">Back to mock tests<ArrowRight size={15}/></Link> : <button onClick={startAgain} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-card px-3.5 text-sm font-semibold"><RotateCcw size={15}/>Try again</button>}</div>}{!grade && <button onClick={() => void submitAnswers()} disabled={saving || !ready} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50">{saving ? "Checking answers…" : "Check answers"}<FastForward size={15}/></button>}
      {history.length > 0 && <section className="mt-8" aria-labelledby="listening-history-heading"><h3 id="listening-history-heading" className="font-semibold">Attempt history</h3><ol className="mt-2 divide-y divide-border rounded-xl border border-border bg-card">{history.map((attempt) => <li key={attempt.id} className="flex justify-between gap-3 px-3 py-3 text-sm"><time dateTime={attempt.submittedAt} className="text-muted-foreground">{new Date(attempt.submittedAt).toLocaleString()}</time><span className="font-semibold">{attempt.score}/{attempt.questionCount}</span></li>)}</ol></section>}
    </section><div className="mt-10 border-t border-border pt-5"><Link href="/dashboard/listening" className="inline-flex items-center gap-2 text-sm font-semibold text-secondary-foreground hover:text-foreground"><ArrowLeft size={15}/>Back to all listening exercises</Link></div>
  </div></main>;
}
