"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ArticleCategory, ExerciseLevel } from "@/generated/prisma/enums";
import { ExercisePlayer } from "@/components/exercises/player";
import { exerciseLabels, isListening, type Kind } from "@/lib/exercises/shared";
import type { ExerciseDraft } from "@/lib/exercises/validation";
import type { PublicExercise } from "@/lib/exercises/server";

const field = "w-full rounded-lg border border-input bg-background px-3 py-2";
const button = "rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-40";
type Item = ExerciseDraft & { id: string; updatedAt: string; createdAt: string };
type Question = ExerciseDraft["questions"][number];
type TextKey = "title" | "description" | "passage" | "target" | "definition" | "translation" | "example" | "pronunciation";

function blank(kind: Kind): ExerciseDraft {
  return { kind, title: "", description: "", category: "SCIENCE", level: "B2", duration: isListening(kind) ? 60 : 5, coverUrl: "", audioUrl: "", passage: "", target: "", definition: "", translation: "", example: "", pronunciation: "", showTranscript: true, isPublished: false, publicationDate: "", questions: [] };
}

function toDraft(item: Item): ExerciseDraft {
  return { ...blank(item.kind), ...item, coverUrl: item.coverUrl ?? "", audioUrl: item.audioUrl ?? "", publicationDate: item.publicationDate ?? "" };
}

function uploadMedia(file: File, kind: string, progress: (value: number) => void) {
  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/exercise-media");
    xhr.responseType = "json";
    xhr.upload.onprogress = (event) => { if (event.lengthComputable) progress(Math.round(100 * event.loaded / event.total)); };
    xhr.onload = () => xhr.status === 201 ? resolve(xhr.response.url) : reject(new Error(xhr.response?.error ?? "Upload failed."));
    xhr.onerror = () => reject(new Error("Upload failed. Check your connection."));
    const form = new FormData();
    form.append("kind", kind);
    form.append("file", file);
    xhr.send(form);
  });
}

function MediaField({ kind, value, change, error, busy }: { kind: "audio" | "image"; value: string; change: (url: string) => void; error: (message: string) => void; busy: (value: boolean) => void }) {
  const [progress, setProgress] = useState<number>();
  async function upload(file?: File) {
    if (!file || progress !== undefined) return;
    setProgress(0);
    busy(true);
    try { change(await uploadMedia(file, kind, setProgress)); }
    catch (errorValue) { error(errorValue instanceof Error ? errorValue.message : "Upload failed."); }
    finally { setProgress(undefined); busy(false); }
  }
  return <div className="space-y-2 rounded-xl border border-border p-3" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); if (!event.currentTarget.closest("fieldset")?.disabled) void upload(event.dataTransfer.files[0]); }}>
    <label className="grid gap-2 text-sm font-semibold">{kind === "audio" ? "Audio recording" : "Cover image"}<input type="file" accept={kind === "audio" ? ".mp3,.wav,.ogg,.m4a,.aac" : ".png,.jpg,.jpeg,.webp"} onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = ""; }} /></label>
    {progress !== undefined && <progress className="w-full" max={100} value={progress} aria-label="Upload progress" />}
    {value && (kind === "audio" ? <audio src={value} controls preload="metadata" className="w-full" /> : <div aria-label="Cover preview" role="img" className="h-28 rounded-lg bg-cover bg-center" style={{ backgroundImage: `url(${value})` }} />)}
    {value && <button type="button" className={button} onClick={() => change("")}>Remove file</button>}
  </div>;
}

export function ExerciseManager({ initialKind }: { initialKind: Kind }) {
  const [kind, setKind] = useState(initialKind);
  const [filters, setFilters] = useState({ q: "", category: "", level: "", status: "", sort: "updatedAt" });
  const [applied, setApplied] = useState(filters);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Item[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [selected, setSelected] = useState("");
  const [draft, setDraft] = useState(() => blank(initialKind));
  const [refresh, setRefresh] = useState(0);
  const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const locked = busy || uploading;

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({ ...applied, kind, page: String(page) });
    void fetch(`/api/admin/exercises?${query}`, { signal: controller.signal }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (controller.signal.aborted) return;
      setItems(data.items);
      setHasMore(data.hasMore);
      setLoading(false);
    }).catch((error: Error) => {
      if (controller.signal.aborted) return;
      setMessage(error.message);
      setLoading(false);
    });
    return () => controller.abort();
  }, [kind, applied, page, refresh]);

  function change<K extends keyof ExerciseDraft>(key: K, value: ExerciseDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function choose(item?: Item, nextKind = kind) {
    setSelected(item?.id ?? "");
    setDraft(item ? toDraft(item) : blank(nextKind));
    setMessage("");
    setPreview(false);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch(selected ? `/api/admin/exercises/${selected}` : "/api/admin/exercises", {
        method: selected ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      choose(data.item);
      setRefresh((value) => value + 1);
      setMessage("Saved.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save."); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!window.confirm(`Delete “${draft.title}”?`)) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/exercises/${selected}`, { method: "DELETE" });
      if (!response.ok) throw new Error((await response.json()).error);
      choose();
      setRefresh((value) => value + 1);
      setMessage("Deleted.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not delete."); }
    finally { setBusy(false); }
  }

  function questionAt(index: number, question: Question) {
    change("questions", draft.questions.map((item, i) => i === index ? question : item));
  }
  function move(index: number, direction: number) {
    const questions = [...draft.questions];
    [questions[index], questions[index + direction]] = [questions[index + direction], questions[index]];
    change("questions", questions);
  }

  function input(key: TextKey, label: string, multiline = false) {
    return <label className="grid gap-1 text-sm font-medium">{label}
      {multiline ? <textarea className={field} rows={key === "passage" ? 8 : 3} value={draft[key] ?? ""} onChange={(event) => change(key, event.target.value)} />
        : <input className={field} required={key === "title"} value={draft[key] ?? ""} onChange={(event) => change(key, event.target.value)} />}
    </label>;
  }

  const audio = isListening(kind);
  const vocabulary = kind === "ACADEMIC_VOCABULARY";
  const transcription = kind === "TRANSCRIPTION";
  const previewData: PublicExercise = {
    ...draft, id: "preview", coverUrl: draft.coverUrl || null, audioUrl: draft.audioUrl || null,
    updatedAt: "", createdAt: "", publicationDate: draft.publicationDate || null,
    passage: transcription || (audio && !draft.showTranscript) ? "" : draft.passage,
    questions: draft.questions.map(({ prompt, options }, index) => ({ id: String(index), prompt, options: options.map(({ text }, option) => ({ id: String(option), text })) })),
  };

  return <div className="grid items-start gap-5 lg:grid-cols-[minmax(230px,1fr)_minmax(0,2fr)]">
    <aside className="space-y-4 rounded-2xl border border-border bg-card p-4">
      <label className="grid gap-1 text-sm font-semibold">Content type<select disabled={locked} className={field} value={kind} onChange={(event) => {
        const next = event.target.value as Kind; setLoading(true); setItems([]); setKind(next); setPage(1); choose(undefined, next);
      }}>{Object.entries(exerciseLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <form className="grid gap-2" onSubmit={(event) => { event.preventDefault(); setLoading(true); setApplied({ ...filters }); setPage(1); }}>
        <input aria-label="Search by title" placeholder="Search by title" className={field} value={filters.q} onChange={(event) => setFilters({ ...filters, q: event.target.value })} />
        <select aria-label="Filter by category" className={field} value={filters.category} onChange={(event) => setFilters({ ...filters, category: event.target.value })}><option value="">All categories</option>{Object.values(ArticleCategory).map((value) => <option key={value}>{value}</option>)}</select>
        <select aria-label="Filter by level" className={field} value={filters.level} onChange={(event) => setFilters({ ...filters, level: event.target.value })}><option value="">All levels</option>{Object.values(ExerciseLevel).map((value) => <option key={value}>{value}</option>)}</select>
        <select aria-label="Filter by status" className={field} value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="">All statuses</option><option value="draft">Draft</option><option value="published">Published</option></select>
        <select aria-label="Sort content" className={field} value={filters.sort} onChange={(event) => setFilters({ ...filters, sort: event.target.value })}><option value="updatedAt">Recently updated</option><option value="category">Category</option><option value="level">Difficulty</option><option value="isPublished">Status</option></select>
        <button className={button} disabled={locked}>Apply filters</button>
      </form>
      <button type="button" className={button} disabled={locked} onClick={() => choose()}>New exercise</button>
      {loading && <p className="text-sm">Loading…</p>}
      {!loading && !items.length && <p className="text-sm text-muted-foreground">No matching content.</p>}
      <ul className="divide-y divide-border">{items.map((item) => <li key={item.id}><button type="button" disabled={locked} aria-pressed={selected === item.id} onClick={() => choose(item)} className="block w-full break-words rounded-lg p-2 text-left hover:bg-muted aria-pressed:bg-secondary"><strong className="text-sm">{item.title}</strong><span className="block text-xs text-muted-foreground">{item.isPublished ? "Published" : "Draft"} · {item.level} · {item.category}</span></button></li>)}</ul>
      <div className="flex justify-between gap-2">{page > 1 && <button className={button} disabled={locked} onClick={() => { setLoading(true); setPage(page - 1); }}>Previous</button>}{hasMore && <button className={button} disabled={locked} onClick={() => { setLoading(true); setPage(page + 1); }}>Next</button>}</div>
    </aside>
    <div className="min-w-0 space-y-4">
      <form onSubmit={save} className="rounded-2xl border border-border bg-card p-4 sm:p-6">
        <fieldset disabled={locked} className="space-y-4">
          <legend className="mb-3 text-xl font-semibold">{selected ? "Edit" : "Create"} {exerciseLabels[kind]}</legend>
          {input("title", vocabulary ? "Word" : "Title")}
          {input("description", "Short description", true)}
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="grid gap-1 text-sm">Category<select className={field} value={draft.category} onChange={(event) => change("category", event.target.value as ExerciseDraft["category"])}>{Object.values(ArticleCategory).map((value) => <option key={value}>{value}</option>)}</select></label>
            <label className="grid gap-1 text-sm">Difficulty<select className={field} value={draft.level} onChange={(event) => change("level", event.target.value as ExerciseDraft["level"])}>{Object.values(ExerciseLevel).map((value) => <option key={value}>{value}</option>)}</select></label>
            <label className="grid gap-1 text-sm">Duration ({audio ? "sec" : "min"})<input className={field} type="number" min={1} max={7200} required value={draft.duration} onChange={(event) => change("duration", Number(event.target.value))} /></label>
          </div>
          <MediaField key={`cover-${selected}-${kind}`} kind="image" value={draft.coverUrl} change={(url) => change("coverUrl", url)} error={setMessage} busy={setUploading} />
          {audio && <MediaField key={`audio-${selected}-${kind}`} kind="audio" value={draft.audioUrl} change={(url) => change("audioUrl", url)} error={setMessage} busy={setUploading} />}
          {vocabulary ? <>{input("definition", "Definition", true)}{input("translation", "Translation")}{input("pronunciation", "Pronunciation")}{input("example", "Example", true)}</> : input("passage", audio ? "Transcript (speaker labels and timestamps can be written on each line)" : "Reading passage", true)}
          {audio && !transcription && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.showTranscript} onChange={(event) => change("showTranscript", event.target.checked)} />Allow students to reveal transcript</label>}
          {(kind === "SYNONYM_HUNTER" || kind === "CONTEXT_CLUES") && input("target", "Target word")}
          {!vocabulary && !transcription && <section className="space-y-3 border-t border-border pt-4">
            <h2 className="font-semibold">Exercise questions</h2>
            {draft.questions.map((question, index) => <fieldset key={index} className="space-y-3 rounded-xl border border-border p-3">
              <legend className="px-2 text-sm font-semibold">Question {index + 1} · Multiple choice</legend>
              <label className="grid gap-1 text-sm">Prompt<input className={field} value={question.prompt} onChange={(event) => questionAt(index, { ...question, prompt: event.target.value })} /></label>
              <label className="grid gap-1 text-sm">Explanation<textarea className={field} value={question.explanation} onChange={(event) => questionAt(index, { ...question, explanation: event.target.value })} /></label>
              {question.options.map((option, optionIndex) => <div key={optionIndex} className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-1 text-sm"><input type="radio" name={`answer-${index}`} checked={option.correct} onChange={() => questionAt(index, { ...question, options: question.options.map((entry, i) => ({ ...entry, correct: i === optionIndex })) })} />Correct</label>
                <input aria-label={`Option ${optionIndex + 1}`} className={`${field} min-w-24 flex-1`} value={option.text} onChange={(event) => questionAt(index, { ...question, options: question.options.map((entry, i) => i === optionIndex ? { ...entry, text: event.target.value } : entry) })} />
                <button type="button" className={button} disabled={question.options.length <= 2} onClick={() => questionAt(index, { ...question, options: question.options.filter((_, i) => i !== optionIndex) })}>Remove</button>
              </div>)}
              <div className="flex flex-wrap gap-2">
                <button type="button" className={button} disabled={question.options.length >= 8} onClick={() => questionAt(index, { ...question, options: [...question.options, { text: "", correct: false }] })}>Add option</button>
                <button type="button" className={button} disabled={index === 0} onClick={() => move(index, -1)}>Move up</button>
                <button type="button" className={button} disabled={index === draft.questions.length - 1} onClick={() => move(index, 1)}>Move down</button>
                <button type="button" className={button} onClick={() => change("questions", draft.questions.filter((_, i) => i !== index))}>Remove question</button>
              </div>
            </fieldset>)}
            <button type="button" className={button} disabled={draft.questions.length >= 40} onClick={() => change("questions", [...draft.questions, { prompt: "", explanation: "", options: [{ text: "", correct: true }, { text: "", correct: false }] }])}>Add question</button>
          </section>}
          <div className="flex flex-wrap items-end gap-3 border-t border-border pt-4">
            <label className="grid gap-1 text-sm">Publication date (UTC)<input type="date" className={field} value={draft.publicationDate.slice(0, 10)} onChange={(event) => change("publicationDate", event.target.value ? new Date(event.target.value).toISOString() : "")} /></label>
            <label className="flex items-center gap-2 py-2 text-sm"><input type="checkbox" checked={draft.isPublished} onChange={(event) => change("isPublished", event.target.checked)} />Published</label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">{busy ? "Saving…" : "Save"}</button>
            <button type="button" className={button} onClick={() => setPreview(!preview)}>{preview ? "Hide preview" : "Student preview"}</button>
            {selected && <button type="button" className={button} onClick={() => void remove()}>Delete</button>}
          </div>
        </fieldset>
        {message && <p role="status" className="mt-3 text-sm">{message}</p>}
      </form>
      {preview && <section aria-label="Student preview" className="rounded-2xl border border-border p-4"><ExercisePlayer key={kind + draft.questions.length} exercise={previewData} preview /></section>}
    </div>
  </div>;
}
