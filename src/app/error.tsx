"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Page render failed", { name: error.name, digest: error.digest });
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center bg-background px-6 py-16">
      <section className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-destructive/10 text-destructive"><AlertTriangle aria-hidden="true" size={21} /></span>
        <h1 className="display-font mt-5 text-3xl">That didn’t go as planned.</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">Something went wrong while loading this page. Try again, or return to the home page.</p>
        <div className="mt-6 flex justify-center gap-3">
          <button onClick={() => reset()} className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90"><RefreshCw aria-hidden="true" size={15} /> Try again</button>
          <Link href="/" className="inline-flex h-11 items-center rounded-xl border border-border px-4 text-sm font-semibold text-foreground hover:bg-muted">Go home</Link>
        </div>
      </section>
    </main>
  );
}
