"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ReadingQuestionType } from "@/generated/prisma/enums";

type Article = { id: string; title: string; activeReadingTestVersion: number };
type Question = {
  id: string;
  type: ReadingQuestionType;
  testVersion: number;
  position: number;
  prompt: string;
  passageBlockIndex: number | null;
  evidenceBlockIndex: number;
  options: { id: string; text: string }[] | null;
  correctAnswers: string[];
  explanation: string;
};
type Draft = Omit<Question, "id" | "options" | "correctAnswers"> & { options: { id: string; text: string }[]; correctAnswers: string };

const input = "min-h-10 w-full rounded-lg border border-input bg-background px-3 py-2";
const primary = "rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50";

async function request(url: string, options?: RequestInit) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error ?? "Request failed. Try again.");
  return data;
}

export function QuestionsManager() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [articleId, setArticleId] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void request("/api/admin/articles", { signal: controller.signal }).then(({ articles }: { articles: Article[] }) => {
      if (controller.signal.aborted) return;
      const initial = new URLSearchParams(window.location.search).get("article");
      setArticles(articles);
      setArticleId((articles.find((article) => article.id === initial) ?? articles[0])?.id ?? "");
    }).catch((error: Error) => {
      if (!controller.signal.aborted) setMessage(error.message);
    });
    return () => controller.abort();
  }, []);

  const article = articles.find(({ id }) => id === articleId);
  return (
    <div className="mt-5">
      <label className="grid max-w-lg gap-2 text-sm font-semibold">Article
        <select value={articleId} onChange={(event) => setArticleId(event.target.value)} className={input}>
          {!articles.length && <option value="">No article selected</option>}
          {articles.map(({ id, title }) => <option key={id} value={id}>{title}</option>)}
        </select>
      </label>
      {message && <p role="status" className="mt-3 text-sm">{message}</p>}
      {article && <QuestionEditor key={article.id} article={article} />}
    </div>
  );
}

function newQuestion(article: Article, questions: Question[]): Draft {
  const version = article.activeReadingTestVersion;
  const position = Math.max(0, ...questions.filter((question) => question.testVersion === version).map((question) => question.position)) + 1;
  return {
    type: "MULTIPLE_CHOICE", testVersion: version, position, prompt: "", passageBlockIndex: null,
    evidenceBlockIndex: 0, options: [], correctAnswers: "", explanation: "",
  };
}

function QuestionEditor({ article }: { article: Article }) {
  const endpoint = `/api/admin/articles/${article.id}/questions`;
  const [items, setItems] = useState<Question[]>([]);
  const [selected, setSelected] = useState<Question>();
  const [draft, setDraft] = useState(() => newQuestion(article, []));
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void request(endpoint, { signal: controller.signal }).then(({ questions }: { questions: Question[] }) => {
      if (controller.signal.aborted) return;
      setItems(questions);
      setDraft(newQuestion(article, questions));
      setLoading(false);
    }).catch((error: Error) => {
      if (!controller.signal.aborted) setMessage(error.message);
    });
    return () => controller.abort();
  }, [article, endpoint]);

  function choose(question?: Question, questions = items) {
    setSelected(question);
    setDraft(question ? { ...question, options: question.options ?? [], correctAnswers: question.correctAnswers.join("\n") } : newQuestion(article, questions));
    setMessage("");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const correctAnswers = draft.correctAnswers.split("\n").map((answer) => answer.trim()).filter(Boolean);
      const { question } = await request(selected ? `/api/admin/questions/${selected.id}` : endpoint, {
        method: selected ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, articleId: article.id, correctAnswers }),
      });
      setItems([...items.filter(({ id }) => id !== question.id), question].sort((a, b) => b.testVersion - a.testVersion || a.position - b.position));
      choose(question);
      setMessage("Saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!selected || !window.confirm(`Delete question ${selected.position}?`)) return;
    setBusy(true);
    try {
      await request(`/api/admin/questions/${selected.id}`, { method: "DELETE" });
      const remaining = items.filter(({ id }) => id !== selected.id);
      setItems(remaining);
      choose(undefined, remaining);
      setMessage("Deleted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-5 grid items-start gap-5 lg:grid-cols-[1fr_2fr]">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold">Questions</h2>
          <button type="button" disabled={busy || loading} className={primary} onClick={() => choose()}>New</button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Active practice version {article.activeReadingTestVersion}</p>
        <ul className="mt-3 max-h-[65vh] overflow-auto">
          {items.map((question) => <li key={question.id}><button type="button" disabled={busy} aria-pressed={selected?.id === question.id} className="block w-full rounded-lg p-3 text-left text-sm hover:bg-secondary aria-pressed:bg-secondary" onClick={() => choose(question)}><b>V{question.testVersion} · Q{question.position}</b> {question.prompt}</button></li>)}
        </ul>
      </div>
      <form onSubmit={save} className="rounded-2xl border border-border bg-card p-4">
        <fieldset disabled={busy || loading} className="grid gap-4">
          <legend className="mb-4 font-semibold">{selected ? "Edit question" : "New question"}</legend>
          <label className="grid gap-1 text-sm">Type<select className={input} value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value as ReadingQuestionType })}>{Object.values(ReadingQuestionType).map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}</select></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1 text-sm">Position<input className={input} required type="number" min={1} value={draft.position} onChange={(event) => setDraft({ ...draft, position: Number(event.target.value) })} /></label>
            <label className="grid gap-1 text-sm">Test version<input className={input} required type="number" min={1} value={draft.testVersion} onChange={(event) => setDraft({ ...draft, testVersion: Number(event.target.value) })} /></label>
            <label className="grid gap-1 text-sm">Evidence block index<input className={input} required type="number" min={0} value={draft.evidenceBlockIndex} onChange={(event) => setDraft({ ...draft, evidenceBlockIndex: Number(event.target.value) })} /></label>
            <label className="grid gap-1 text-sm">Passage block index<input className={input} type="number" min={0} value={draft.passageBlockIndex ?? ""} onChange={(event) => setDraft({ ...draft, passageBlockIndex: event.target.value === "" ? null : Number(event.target.value) })} /></label>
          </div>
          <label className="grid gap-1 text-sm">Prompt<textarea className={input} required value={draft.prompt} onChange={(event) => setDraft({ ...draft, prompt: event.target.value })} /></label>
          <fieldset className="grid gap-2">
            <legend className="text-sm font-semibold">Answer options</legend>
            {draft.options.map((option, index) => <div key={index} className="grid gap-2 sm:grid-cols-[5rem_1fr_auto]">
              <input required className={input} aria-label={`Option ${index + 1} ID`} value={option.id} onChange={(event) => setDraft({ ...draft, options: draft.options.map((entry, i) => i === index ? { ...entry, id: event.target.value } : entry) })} />
              <input required className={input} aria-label={`Option ${index + 1} text`} value={option.text} onChange={(event) => setDraft({ ...draft, options: draft.options.map((entry, i) => i === index ? { ...entry, text: event.target.value } : entry) })} />
              <button type="button" className="px-2 text-sm text-destructive" onClick={() => setDraft({ ...draft, options: draft.options.filter((_, i) => i !== index) })}>Remove</button>
            </div>)}
            <button type="button" className="w-fit rounded border border-border px-3 py-2 text-sm" onClick={() => setDraft({ ...draft, options: [...draft.options, { id: "", text: "" }] })}>Add option</button>
          </fieldset>
          <label className="grid gap-1 text-sm">Correct answers (one text answer or option ID per line)<textarea className={input} required value={draft.correctAnswers} onChange={(event) => setDraft({ ...draft, correctAnswers: event.target.value })} /></label>
          <label className="grid gap-1 text-sm">Explanation<textarea className={input} required value={draft.explanation} onChange={(event) => setDraft({ ...draft, explanation: event.target.value })} /></label>
          <div className="flex gap-2">
            <button className={primary}>{busy ? "Working…" : "Save"}</button>
            {selected && <button type="button" className="rounded-lg border border-destructive/30 px-4 py-2 text-sm text-destructive" onClick={() => void remove()}>Delete</button>}
          </div>
        </fieldset>
        {message && <p role="status" className="mt-3 text-sm text-muted-foreground">{message}</p>}
      </form>
    </section>
  );
}
