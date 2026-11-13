"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { ArticleCategory, ArticleDifficulty } from "@/generated/prisma/enums";

import { ListeningFields } from "./listening-fields";

const sections = {
  articles: "Reading practice",
  listening: "Listening practice",
  "mock-tests": "Mock tests",
};

type Kind = keyof typeof sections;
type Item = Record<string, unknown> & { id: string; title: string; isPublished: boolean };
type Source = { skill: "READING" | "LISTENING"; slug: string; title: string };
type Field = { name: string; label: string; type?: "number" | "textarea"; options?: string[]; min?: number; max?: number };

const commonFields: Field[] = [
  { name: "title", label: "Title" },
  { name: "slug", label: "URL slug" },
  { name: "description", label: "Description", type: "textarea" },
  { name: "difficulty", label: "Difficulty", options: Object.values(ArticleDifficulty) },
];

const fields: Record<Kind, Field[]> = {
  articles: [
    ...commonFields,
    { name: "category", label: "Category", options: Object.values(ArticleCategory) },
    { name: "readingTime", label: "Reading time (minutes)", type: "number", min: 1, max: 120 },
        { name: "content", label: "Passage text (blank line between paragraphs, # before headings)", type: "textarea" },
  ],
  listening: [
    ...commonFields,
    { name: "category", label: "Category" },
    { name: "duration", label: "Recording length (seconds)", type: "number", min: 1, max: 720 },
    { name: "audioUrl", label: "Audio URL" },
  ],
  "mock-tests": [
    { name: "title", label: "Title" },
    { name: "duration", label: "Time limit (minutes)", type: "number", min: 1, max: 720 },
  ],
};

const defaults: Record<Kind, Record<string, unknown>> = {
  articles: { difficulty: "INTERMEDIATE", category: Object.values(ArticleCategory)[0], readingTime: 5, wordCount: 100 },
  listening: { difficulty: "INTERMEDIATE", duration: 60, transcript: [], questions: [] },
  "mock-tests": { skill: "READING", duration: 20 },
};

const control = "min-h-10 w-full rounded-lg border border-input bg-background px-3 py-2";
const tab = "rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary";
const primary = "rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50";

export function AdminConsole() {
  const [kind, setKind] = useState<Kind>("articles");

  return (
    <>
      <nav aria-label="Admin sections" className="flex flex-wrap gap-2">
        {(Object.keys(sections) as Kind[]).map((section) => (
          <button key={section} type="button" aria-pressed={kind === section} onClick={() => setKind(section)} className={`${tab} aria-pressed:border-primary aria-pressed:bg-secondary`}>{sections[section]}</button>
        ))}
        <Link href="/dashboard/admin/exercises" className={tab}>Exercise management</Link><Link href="/dashboard/admin/exercises?kind=ACADEMIC_VOCABULARY" className={tab}>Academic vocabulary</Link><Link href="/dashboard/admin/exercises?kind=SHORT_PODCAST" className={tab}>Listening exercises</Link><Link href="/dashboard/admin/questions" className={tab}>Reading questions</Link>
        <Link href="/dashboard/admin/users" className={tab}>Users</Link>
      </nav>
      <ContentEditor key={kind} kind={kind} />
    </>
  );
}

async function request(url: string, options?: RequestInit) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const errors = Object.entries(data?.details?.fieldErrors ?? {}).map(([field, messages]) => `${field} — ${String(messages)}`);
    throw new Error(errors.join(". ") || data?.error || "Request failed. Try again.");
  }
  return data;
}

function ContentEditor({ kind }: { kind: Kind }) {
  const endpoint = `/api/admin/${kind}`;
  const [catalog, setCatalog] = useState<{ items: Item[]; sources: Source[] }>();
  const [selected, setSelected] = useState<Item>();
  const [draft, setDraft] = useState<Record<string, unknown>>(defaults[kind]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void request(endpoint, { signal: controller.signal }).then((data) => {
      if (!controller.signal.aborted) setCatalog({ items: data.articles ?? data.materials ?? data.tests, sources: data.sources ?? [] });
    }).catch((error: Error) => {
      if (!controller.signal.aborted) setMessage(error.message);
    });
    return () => controller.abort();
  }, [endpoint]);

  function choose(item?: Item) {
    setSelected(item);
    setMessage("");
    if (!item) {
      setDraft(defaults[kind]);
      return;
    }
    if (kind === "articles") {
      let blocks: { type: string; text: string }[] = [];
      try {
        const parsed: unknown = JSON.parse(String(item.content));
        if (Array.isArray(parsed)) blocks = parsed;
      } catch {}
      const content = blocks.length ? blocks.map(({ type, text }) => type === "heading" ? "# " + text : text).join("\n\n") : String(item.content ?? "");
      setDraft({ ...item, content });
    } else setDraft(item);
  }
  function change(name: string, value: unknown) {
    setDraft((current) => ({ ...current, [name]: value }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const payload: Record<string, unknown> = { isPublished: Boolean(draft.isPublished) };
      for (const field of fields[kind]) {
        const value = draft[field.name];
        payload[field.name] = field.type === "number" ? Number(value) : value;
      }
      if (kind === "articles") {
        const blocks = String(draft.content ?? "").split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean)
          .map((part) => part.startsWith("# ") ? { type: "heading", text: part.slice(2) } : { type: "paragraph", text: part });
        payload.content = JSON.stringify(blocks);
        payload.wordCount = blocks.filter(({ type }) => type === "paragraph").reduce((count, { text }) => count + text.split(/\s+/).length, 0);
      }
      if (kind === "listening") {
        payload.transcript = draft.transcript;
        payload.questions = draft.questions;
      }
      if (kind === "mock-tests") {
        payload.skill = draft.skill;
        payload.sourceSlug = draft.sourceSlug;
      }
      const data = await request(selected ? `${endpoint}/${selected.id}` : endpoint, {
        method: selected ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const saved: Item = data.article ?? data.material ?? data.test;
      setCatalog((current) => current && { ...current, items: [saved, ...current.items.filter((item) => item.id !== saved.id && item.id !== selected?.id)] });
      choose(saved);
      setMessage("Saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!selected || !window.confirm(`Delete “${selected.title}”?`)) return;
    setBusy(true);
    setMessage("");
    try {
      const data = await request(`${endpoint}/${selected.id}`, { method: "DELETE" });
      setCatalog((current) => {
        if (!current) return current;
        const items = current.items.filter((item) => item.id !== selected.id && item.id !== data.material?.id);
        return { ...current, items: data.material ? [data.material, ...items] : items };
      });
      choose(data.material);
      setMessage(data.material ? "Removed from the learner catalog. The material is saved as a draft." : "Deleted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete.");
    } finally {
      setBusy(false);
    }
  }

  async function upload(file?: File) {
    if (!file) return;
    const body = new FormData();
    body.set("file", file);
    setBusy(true);
    try {
      const data = await request("/api/admin/audio", { method: "POST", body });
      change("audioUrl", data.url);
      setMessage("Audio uploaded. Save to attach it to this exercise.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not upload audio.");
    } finally {
      setBusy(false);
    }
  }

  const sourceSlug = String(draft.sourceSlug ?? "");
  const sources = catalog?.sources.filter((source) => source.skill === draft.skill) ?? [];

  return (
    <section className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(220px,1fr)_minmax(0,2fr)]">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-semibold">{sections[kind]}</h2>
          <button type="button" disabled={busy} onClick={() => choose()} className={primary}>New</button>
        </div>
        <ul className="max-h-[65vh] space-y-1 overflow-auto">
          {catalog?.items.map((item) => (
            <li key={item.id}><button type="button" disabled={busy} onClick={() => choose(item)} aria-pressed={selected?.id === item.id} className="block w-full rounded-lg p-3 text-left hover:bg-secondary aria-pressed:bg-secondary">
              <span className="block break-words text-sm font-medium">{item.title}</span>
              <span className="text-xs text-muted-foreground">{item.isPublished ? "Published" : "Draft"}</span>
            </button></li>
          ))}
        </ul>
        {!catalog && !message && <p className="text-sm text-muted-foreground">Loading…</p>}
        {catalog?.items.length === 0 && <p className="text-sm text-muted-foreground">No items yet.</p>}
      </div>
      <form onSubmit={save} className="rounded-2xl border border-border bg-card p-4">
        <fieldset disabled={busy || !catalog} className="grid gap-4">
          <legend className="mb-4 font-semibold">{selected ? "Edit" : "Create"} {kind === "mock-tests" ? "mock test" : "practice material"}</legend>
          {kind === "mock-tests" && (
            <>
              <label className="grid gap-1 text-sm">Skill
                <select className={control} value={String(draft.skill)} onChange={(event) => setDraft({ ...draft, skill: event.target.value, sourceSlug: "" })}>
                  <option value="READING">Reading</option><option value="LISTENING">Listening</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm">Practice material
                <select required className={control} value={sourceSlug} onChange={(event) => change("sourceSlug", event.target.value)}>
                  <option value="">Choose a published exercise</option>
                  {sourceSlug && !sources.some((source) => source.slug === sourceSlug) && <option value={sourceSlug}>{sourceSlug} (unavailable)</option>}
                  {sources.map((source) => <option key={source.slug} value={source.slug}>{source.title}</option>)}
                </select>
              </label>
            </>
          )}
          {fields[kind].map((field) => {
            const value = String(draft[field.name] ?? "");
            const update = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => change(field.name, event.target.value);
            return (
              <label key={field.name} className="grid gap-1 text-sm">{field.label}
                {field.options ? <select className={control} value={value} onChange={update}>{field.options.map((option) => <option key={option}>{option}</option>)}</select>
                  : field.type === "textarea" ? <textarea required rows={field.name === "description" ? 3 : 8} className={control} value={value} onChange={update} />
                  : <input required readOnly={Boolean(selected && kind === "listening" && field.name === "slug")} className={control} type={field.type ?? "text"} min={field.min} max={field.max} value={value} onChange={update} />}
              </label>
            );
          })}
          {kind === "listening" && <ListeningFields cues={(draft.transcript ?? []) as Parameters<typeof ListeningFields>[0]["cues"]} questions={(draft.questions ?? []) as Parameters<typeof ListeningFields>[0]["questions"]} change={change} />}
          {kind === "listening" && <label className="grid gap-1 text-sm">Upload audio<input type="file" accept="audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/aac" onChange={(event) => void upload(event.target.files?.[0])} /></label>}
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(draft.isPublished)} onChange={(event) => change("isPublished", event.target.checked)} /> Published</label>
          <div className="flex flex-wrap gap-2">
            <button className={primary}>{busy ? "Working…" : "Save"}</button>
            {selected && <button type="button" className="rounded-lg border border-destructive/30 px-4 py-2 text-sm text-destructive" onClick={() => void remove()}>Delete</button>}
            {selected && kind === "articles" && <Link className={tab} href={`/dashboard/admin/questions?article=${encodeURIComponent(selected.id)}`}>Edit questions</Link>}
          </div>
        </fieldset>
        {message && <p role="status" className="mt-3 text-sm text-muted-foreground">{message}</p>}
      </form>
    </section>
  );
}
