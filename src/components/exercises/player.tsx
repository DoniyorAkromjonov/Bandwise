"use client";

import { useEffect, useState } from "react";
import type { PublicExercise } from "@/lib/exercises/server";
import { instructions } from "@/lib/exercises/shared";
import { words } from "@/lib/exercises/grading";

type Result = {
  score: number; total: number; vocabulary?: string;
  review?: { prompt: string; explanation: string; expected: string; actual: string; correct: boolean }[];
  corrections?: { kind: string; expected?: string; actual?: string }[];
};
export type Attempt = { id: string; date: string; result: Result };
const button = "rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50";

export function ExercisePlayer({ exercise, attempts = [], preview = false }: { exercise: PublicExercise; attempts?: Attempt[]; preview?: boolean }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [active, setActive] = useState(exercise.questions[0]?.id);
  const [transcript, setTranscript] = useState("");
  const [show, setShow] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [result, setResult] = useState<Result>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [token, setToken] = useState("");
  const [history, setHistory] = useState(attempts);
  const [savedWord, setSavedWord] = useState("");
  const [meaning, setMeaning] = useState("");
  const [restored, setRestored] = useState(false);
  const draftKey = `bandwise-exercise:${exercise.id}:${exercise.updatedAt}`;

  useEffect(() => {
    if (preview) return;
    const timer = window.setTimeout(() => {
      try {
        const saved = JSON.parse(sessionStorage.getItem(draftKey) ?? "null");
        if (saved) {
          setAnswers(saved.answers ?? {});
          setTranscript(saved.transcript ?? "");
        }
      } catch {
        // The exercise remains usable if browser storage is unavailable.
      }
      setRestored(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [draftKey, preview]);

  useEffect(() => {
    if (!restored || preview) return;
    try {
      if (result) sessionStorage.removeItem(draftKey);
      else sessionStorage.setItem(draftKey, JSON.stringify({ answers, transcript }));
    } catch {
      // Completed attempts are saved separately on the server.
    }
  }, [answers, draftKey, preview, restored, result, transcript]);

  async function submit(vocabulary?: "reviewed" | "learned") {
    const key = token || crypto.randomUUID();
    setToken(key);
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/exercises/${exercise.id}/attempts`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: key, revision: exercise.updatedAt, answers, transcript: transcript || undefined, vocabulary }),
      });
      const data = await response.json();
      if (!response.ok) {
        setToken("");
        throw new Error(data.error);
      }
      setResult(data.result);
      setHistory((current) => [{ id: key, date: new Date().toISOString(), result: data.result }, ...current]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save result.");
    } finally { setBusy(false); }
  }

  async function saveWord() {
    setBusy(true);
    try {
      const response = await fetch("/api/vocabulary", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: savedWord, definition: meaning, example: exercise.example || undefined }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setMessage("Saved to Personal Vocabulary.");
      setSavedWord("");
      setMeaning("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save word."); }
    finally { setBusy(false); }
  }

  const vocabulary = exercise.kind === "ACADEMIC_VOCABULARY";
  const transcription = exercise.kind === "TRANSCRIPTION";
  const synonym = exercise.kind === "SYNONYM_HUNTER";
  const context = exercise.kind === "CONTEXT_CLUES";
  const target = words(exercise.target ?? "")[0];
  const answerLocked = busy || !!result;
  const ready = transcription ? !!transcript.trim() : exercise.questions.length > 0 && exercise.questions.every(({ id }) => !!answers[id]);

  return <article className="mx-auto max-w-3xl space-y-5">
    {exercise.coverUrl && <div role="img" aria-label={exercise.title} className="h-52 rounded-2xl bg-cover bg-center" style={{ backgroundImage: `url(${exercise.coverUrl})` }} />}
    <header><p className="text-sm text-muted-foreground">{exercise.category} · {exercise.level} · {exercise.audioUrl ? `${exercise.duration} sec` : `${exercise.duration} min`}</p><h1 className="display-font mt-2 text-4xl">{exercise.title}</h1><p className="mt-3 text-muted-foreground">{exercise.description}</p><p className="mt-2 text-sm">{instructions[exercise.kind]}</p></header>
    {exercise.audioUrl && <div className="rounded-xl border border-border bg-card p-4">
      <audio className="w-full" controls preload="metadata" src={exercise.audioUrl} onLoadedMetadata={(event) => { event.currentTarget.playbackRate = speed; }} onError={() => setMessage("The recording could not be loaded.")} />
      <label className="mt-2 flex items-center gap-2 text-sm">Playback speed<select value={speed} onChange={(event) => {
        const rate = Number(event.target.value);
        setSpeed(rate);
        const audio = event.currentTarget.closest("div")?.querySelector("audio");
        if (audio) audio.playbackRate = rate;
      }}>{[0.75, 1, 1.25, 1.5, 2].map((value) => <option key={value} value={value}>{value}×</option>)}</select></label>
      {exercise.passage && <button type="button" aria-expanded={show} onClick={() => setShow(!show)} className="mt-3 text-sm font-semibold text-primary">{show ? "Hide transcript" : "Show transcript"}</button>}
    </div>}
    {synonym && <p className="font-semibold">Target word · {exercise.target}</p>}
    {exercise.passage && (!exercise.audioUrl || show) && <div className="whitespace-pre-wrap rounded-xl border border-border bg-card p-5 leading-8"
      onMouseUp={() => {
        if (preview) return;
        const selection = window.getSelection()?.toString().trim();
        if (selection && selection.length <= 100) { setSavedWord(selection); setMeaning(""); }
      }}>
      {synonym || context ? exercise.passage.split(/([\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*)/gu).map((part, index) => {
        const word = words(part)[0];
        if (index % 2 === 0) return part;
        if (synonym && active) return <button key={index} type="button" disabled={answerLocked} aria-pressed={answers[active] === `word:${word}`} className="rounded hover:bg-secondary aria-pressed:bg-secondary" onClick={() => setAnswers({ ...answers, [active]: `word:${word}` })}>{part}</button>;
        return context && word === target ? <mark key={index} className="rounded bg-secondary px-1 text-secondary-foreground">{part}</mark> : part;
      }) : exercise.passage}
    </div>}
    {vocabulary && <dl className="grid gap-2 rounded-xl border border-border bg-card p-5">
      <dt className="font-semibold">Definition</dt><dd>{exercise.definition}</dd>
      {exercise.translation && <><dt className="font-semibold">Translation</dt><dd>{exercise.translation}</dd></>}
      {exercise.pronunciation && <><dt className="font-semibold">Pronunciation</dt><dd>{exercise.pronunciation}</dd></>}
      {exercise.example && <><dt className="font-semibold">Example</dt><dd>{exercise.example}</dd></>}
    </dl>}
    {!preview && vocabulary && <button type="button" className={button} onClick={() => { setSavedWord(exercise.title); setMeaning(exercise.definition ?? ""); }}>Save to Personal Vocabulary</button>}
    {!preview && !vocabulary && !transcription && !savedWord && <button type="button" className="text-sm font-semibold text-primary" onClick={() => setSavedWord(exercise.target || " ")}>Save a word to Personal Vocabulary</button>}
    {!preview && savedWord && <form className="flex flex-wrap items-end gap-2" onSubmit={(event) => { event.preventDefault(); void saveWord(); }}>
      <label className="grid gap-1 text-sm">Word<input className="rounded border border-input bg-background p-2" required maxLength={100} value={savedWord} onChange={(event) => setSavedWord(event.target.value)} /></label>
      <label className="grid gap-1 text-sm">Meaning<input className="rounded border border-input bg-background p-2" required maxLength={1000} value={meaning} onChange={(event) => setMeaning(event.target.value)} /></label>
      <button className={button} disabled={busy || !savedWord.trim() || !meaning.trim()}>Save word</button>
    </form>}
    {transcription && <label className="grid gap-2 text-sm font-semibold">Your transcription<textarea rows={8} maxLength={20000} className="rounded-xl border border-input bg-background p-3" value={transcript} disabled={answerLocked} onChange={(event) => setTranscript(event.target.value)} /></label>}
    {!transcription && !vocabulary && exercise.questions.map(({ id, prompt, options }, index) => <fieldset key={id} disabled={answerLocked} className="grid gap-2 rounded-xl border border-border bg-card p-4">
      <legend className="px-2 font-semibold">{index + 1}. {prompt}</legend>
      {synonym && <button type="button" aria-pressed={active === id} className="w-fit text-sm font-semibold text-primary" onClick={() => setActive(id)}>Select from passage{answers[id]?.startsWith("word:") ? ` · ${answers[id].slice(5)}` : ""}</button>}
      {options.map((option) => <label key={option.id} className="flex items-start gap-2 text-sm"><input type="radio" name={id} checked={answers[id] === option.id} onChange={() => { setActive(id); setAnswers({ ...answers, [id]: option.id }); }} />{option.text}</label>)}
    </fieldset>)}
    {!preview && !result && (vocabulary ? <div className="flex flex-wrap gap-2"><button className={button} disabled={busy} onClick={() => void submit("reviewed")}>Mark reviewed</button><button className={button} disabled={busy} onClick={() => void submit("learned")}>Mark learned</button></div> : <button className={button} disabled={busy || !ready} onClick={() => void submit()}>{busy ? "Saving…" : "Check answers"}</button>)}
    {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
    {result && <section className="space-y-3 rounded-xl border border-border p-4" aria-label="Result">
      <h2 className="font-semibold">{result.vocabulary ? `Marked ${result.vocabulary}` : `${Math.round(100 * result.score / result.total)}% · ${result.score}/${result.total}`}</h2>
      {result.review?.map((item, index) => <div key={index} className="border-t border-border pt-2 text-sm"><strong>{item.prompt}</strong><p>{item.correct ? "Correct" : `Your answer: ${item.actual} · Correct: ${item.expected}`}</p><p>{item.explanation}</p></div>)}
      {result.corrections && <p className="leading-8">{result.corrections.map((item, index) => <span key={index} className={item.kind === "match" ? "" : "rounded bg-secondary px-1"}>{item.kind === "match" ? item.expected : item.kind === "missing" ? `[Missing: ${item.expected}]` : item.kind === "extra" ? `[Extra: ${item.actual}]` : `[${item.actual} → ${item.expected}]`} </span>)}</p>}
      <button className={button} onClick={() => { setResult(undefined); setAnswers({}); setTranscript(""); setToken(""); }}>Try again</button>
    </section>}
    {!!history.length && <details className="rounded-xl border border-border p-4"><summary className="cursor-pointer font-semibold">Previous attempts</summary><ul className="mt-2 space-y-2 text-sm">{history.map(({ id, date, result: past }) => <li key={id}><button type="button" className="text-primary hover:underline" onClick={() => setResult(past)}>{new Date(date).toLocaleDateString()} · {past.vocabulary ?? `${past.score}/${past.total}`}</button></li>)}</ul></details>}
  </article>;
}
