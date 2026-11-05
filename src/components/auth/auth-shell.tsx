import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpenCheck } from "lucide-react";
import { Brand } from "@/components/layout/brand";

export function AuthShell({ children, title, description }: { children: ReactNode; title: string; description: string }) {
  return (
    <main className="min-h-screen bg-[#FAFAFC]">
      <header className="border-b border-[#E8E8F0] bg-white">
        <div className="page-shell flex h-[72px] items-center justify-between">
          <Brand />
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-[#666580] hover:text-[#24213D]"><ArrowLeft aria-hidden="true" size={16} /> Back home</Link>
        </div>
      </header>
      <div className="page-shell grid min-h-[calc(100vh-73px)] items-center gap-12 py-12 lg:grid-cols-[.85fr_1.15fr] lg:gap-20">
        <section className="hidden max-w-[480px] lg:block">
          <span className="grid size-14 place-items-center rounded-2xl bg-[#F1ECFF] text-[#7047FF]"><BookOpenCheck aria-hidden="true" size={24} strokeWidth={1.7} /></span>
          <p className="eyebrow mt-8">A thoughtful way to prepare</p>
          <h1 className="display-font mt-4 text-5xl leading-[1.08] tracking-[-.04em] text-[#24213D]">Make space for your next step.</h1>
          <p className="mt-5 max-w-[44ch] leading-7 text-[#666580]">Your personal IELTS dashboard brings practice for all four skills into one calm, clear place.</p>
          <div className="mt-9 flex flex-wrap gap-2">
            {["Listening", "Reading", "Writing", "Speaking"].map((skill) => <span key={skill} className="rounded-full border border-[#E8E8F0] bg-white px-3.5 py-2 text-xs font-medium text-[#666580]">{skill}</span>)}
          </div>
        </section>
        <section className="mx-auto w-full max-w-[470px]">
          <div className="mb-7 text-center lg:hidden"><Brand /></div>
          <div className="rounded-2xl border border-[#E8E8F0] bg-white p-6 shadow-[0_20px_55px_-42px_rgba(36,33,61,.35)] sm:p-9">
            <p className="eyebrow">Bandwise</p>
            <h2 className="display-font mt-3 text-4xl leading-tight tracking-[-.035em]">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-[#666580]">{description}</p>
            <div className="mt-7">{children}</div>
          </div>
        </section>
      </div>
    </main>
  );
}
