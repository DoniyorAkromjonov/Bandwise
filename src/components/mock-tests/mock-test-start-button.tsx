"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle } from "lucide-react";

export function MockTestStartButton({ skill, slug, compact = false }: { skill: "READING" | "LISTENING"; slug: string; compact?: boolean }) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  async function start() {
    if (starting) return;
    setStarting(true); setError("");
    try {
      const response = await fetch("/api/mock-tests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ skill, sourceSlug: slug, submissionToken: crypto.randomUUID() }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The test could not be started.");
      const path = skill === "READING" ? `/dashboard/reading/${slug}/practice` : `/dashboard/listening/${slug}`;
      router.push(`${path}?mockTestId=${encodeURIComponent(data.test.id)}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The test could not be started.");
      setStarting(false);
    }
  }
  return <div className={compact ? "flex flex-col items-end gap-1" : "mt-5"}>
    <button type="button" onClick={() => void start()} disabled={starting} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-wait disabled:opacity-60 ${compact ? "px-3" : "w-full sm:w-auto"}`}>
      {starting ? <><LoaderCircle size={15} className="animate-spin"/>Starting…</> : <>Start mock test<ArrowRight size={15}/></>}
    </button>
    {error && <p role="alert" className="max-w-64 text-right text-xs text-destructive">{error}</p>}
  </div>;
}
