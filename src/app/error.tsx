"use client";

import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#FAFAFC] px-6 py-16">
      <section className="w-full max-w-md rounded-2xl border border-[#E8E8F0] bg-white p-8 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-[#FFF5F6] text-[#A42839]"><AlertTriangle aria-hidden="true" size={21} /></span>
        <h1 className="display-font mt-5 text-3xl">That didn’t go as planned.</h1>
        <p className="mt-3 text-sm leading-6 text-[#666580]">Something went wrong while loading this page. Try again, or return to the home page.</p>
        <div className="mt-6 flex justify-center gap-3">
          <button onClick={() => reset()} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#7047FF] px-4 text-sm font-semibold text-white hover:bg-[#5D35EB]"><RefreshCw aria-hidden="true" size={15} /> Try again</button>
          <Link href="/" className="inline-flex h-11 items-center rounded-xl border border-[#E8E8F0] px-4 text-sm font-semibold text-[#24213D] hover:bg-[#F7F7FA]">Go home</Link>
        </div>
      </section>
    </main>
  );
}
