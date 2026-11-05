import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  BookOpenCheck,
  ChartNoAxesCombined,
  Headphones,
  Lightbulb,
  Mic2,
  NotebookPen,
  ScanText,
  Sparkles,
} from "lucide-react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

const skills = [
  { name: "Listening", detail: "Understand conversations, lectures, and the details between them.", icon: Headphones, tint: "#E7FAFF", ink: "#007D93" },
  { name: "Reading", detail: "Build confidence with texts, timing, and question types.", icon: ScanText, tint: "#F1ECFF", ink: "#6843E8" },
  { name: "Writing", detail: "Plan and shape clear responses for both writing tasks.", icon: NotebookPen, tint: "#FFF3E6", ink: "#A65C19" },
  { name: "Speaking", detail: "Develop fluent answers and express ideas with confidence.", icon: Mic2, tint: "#EAF7EF", ink: "#31794E" },
];

const features = [
  {
    icon: BookOpenCheck,
    title: "A clear place to begin",
    description: "Find the practice and learning resources you need, organized around the four IELTS skills.",
    color: "#7047FF",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Your learning, in view",
    description: "Keep your learning journey connected to one personal dashboard as you build your routine.",
    color: "#007D93",
  },
  {
    icon: Lightbulb,
    title: "Practice with direction",
    description: "Move from a broad goal to a focused next step, one skill at a time.",
    color: "#A65C19",
  },
];

export function LandingPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="relative overflow-hidden border-b border-[#E8E8F0]">
          <div className="page-shell grid min-h-[620px] items-center gap-12 py-16 lg:grid-cols-[1.05fr_.95fr] lg:py-20 lg:gap-20">
            <div className="relative z-10 max-w-[620px]">
              <p className="eyebrow mb-5">A clearer way to prepare</p>
              <h1 className="display-font max-w-[13ch] text-[clamp(3.5rem,7.4vw,6.35rem)] leading-[.98] tracking-[-.045em] text-[#24213D]">
                Your IELTS journey starts here.
              </h1>
              <p className="mt-7 max-w-[57ch] text-lg leading-8 text-[#666580]">
                Prepare smarter for IELTS with structured lessons, realistic practice tests, and personalized progress tracking.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href="/register" className="inline-flex min-h-13 items-center justify-center gap-3 rounded-xl bg-[#7047FF] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_-14px_rgba(112,71,255,.7)] transition hover:-translate-y-0.5 hover:bg-[#5D35EB]">
                  Start learning <ArrowRight aria-hidden="true" size={17} />
                </Link>
                <a href="#courses" className="inline-flex min-h-13 items-center justify-center gap-2 rounded-xl border border-[#E8E8F0] bg-white px-6 py-3.5 text-sm font-semibold text-[#24213D] transition hover:border-[#CFC9E8] hover:bg-[#FCFBFF]">
                  Explore courses <ArrowDownRight aria-hidden="true" size={17} />
                </a>
              </div>
              <div className="mt-11 flex flex-wrap gap-x-8 gap-y-3 border-t border-[#E8E8F0] pt-5 text-sm font-medium text-[#666580]">
                <span className="inline-flex items-center gap-2"><span className="size-2 rounded-full bg-[#7047FF]" />Practice tests</span>
                <span className="inline-flex items-center gap-2"><span className="size-2 rounded-full bg-[#00B8D9]" />Learning resources</span>
                <span className="inline-flex items-center gap-2"><span className="size-2 rounded-full bg-[#7DBD91]" />Personal progress</span>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[520px] lg:ml-auto">
              <div aria-hidden="true" className="absolute -right-8 -top-8 size-32 rounded-full bg-[#E7FAFF]" />
              <div aria-hidden="true" className="absolute -bottom-9 -left-8 size-28 rounded-full bg-[#F1ECFF]" />
              <div className="relative overflow-hidden rounded-[1.5rem] border border-[#E8E8F0] bg-white p-6 shadow-[0_26px_70px_-44px_rgba(36,33,61,.4)] sm:p-8">
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#666580]">The IELTS study map</p>
                    <h2 className="display-font mt-2 text-3xl tracking-[-.025em]">Four skills. One clear path.</h2>
                  </div>
                  <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#F5F3FF] text-[#7047FF]"><Sparkles aria-hidden="true" size={19} /></div>
                </div>
                <p className="mt-3 max-w-[38ch] text-sm leading-6 text-[#666580]">Choose a skill to explore, and build your preparation around what matters to you.</p>
                <div className="mt-6 divide-y divide-[#E8E8F0] border-y border-[#E8E8F0]">
                  {skills.map((skill, index) => {
                    const Icon = skill.icon;
                    return (
                      <a href="#skills" key={skill.name} className="group flex items-center gap-4 py-4 transition hover:px-2">
                        <span className="grid size-11 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: skill.tint, color: skill.ink }}><Icon aria-hidden="true" size={19} strokeWidth={1.8} /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-[#24213D]">{skill.name}</span>
                          <span className="mt-1 block text-xs text-[#77768F]">{["Listen with focus", "Read with purpose", "Write with clarity", "Speak with confidence"][index]}</span>
                        </span>
                        <ArrowRight aria-hidden="true" size={16} className="text-[#A7A5BA] transition group-hover:translate-x-1 group-hover:text-[#7047FF]" />
                      </a>
                    );
                  })}
                </div>
                <div className="mt-5 flex items-center gap-3 rounded-xl bg-[#F7F7FA] px-4 py-3.5">
                  <span className="grid size-9 place-items-center rounded-full bg-white text-[#7047FF]"><BookOpenCheck aria-hidden="true" size={17} /></span>
                  <p className="text-xs leading-5 text-[#666580]">Start with one skill. Your preparation can grow from there.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="page-shell py-24 sm:py-28">
          <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
            <div>
              <p className="eyebrow mb-4">Preparation, made manageable</p>
              <h2 className="display-font section-title">Everything you need to take the next step.</h2>
            </div>
            <p className="body-copy pb-1 text-base">IELTS preparation is easier to approach when the work is clear. Build a steady routine with practice, resources, and a personal view of your learning.</p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <article key={feature.title} className="group rounded-2xl border border-[#E8E8F0] bg-white p-7 transition duration-200 hover:-translate-y-1 hover:border-[#D7D2EA] hover:shadow-[0_18px_44px_-34px_rgba(36,33,61,.35)]">
                  <span className="grid size-12 place-items-center rounded-[14px] bg-[#F7F7FA] transition group-hover:bg-[#F5F3FF]" style={{ color: feature.color }}><Icon aria-hidden="true" size={21} strokeWidth={1.8} /></span>
                  <h3 className="mt-6 text-lg font-semibold tracking-[-.02em]">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#666580]">{feature.description}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section id="skills" className="border-y border-[#E8E8F0] bg-[#FAFAFC] py-24 sm:py-28">
          <div className="page-shell grid gap-14 lg:grid-cols-[.7fr_1.3fr]">
            <div className="lg:sticky lg:top-12 lg:self-start">
              <p className="eyebrow mb-4">IELTS preparation</p>
              <h2 className="display-font section-title">A closer look at every skill.</h2>
              <p className="body-copy mt-5">Get familiar with the four parts of the test and find the kind of practice you want to focus on.</p>
              <Link href="/register" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-[#5F45CC] hover:text-[#442BB5]">Find your starting point <ArrowRight aria-hidden="true" size={16} /></Link>
            </div>
            <div id="courses" className="divide-y divide-[#E2E2EB] border-y border-[#E2E2EB]">
              {skills.map((skill, index) => {
                const Icon = skill.icon;
                return (
                  <article key={skill.name} className="grid gap-4 py-6 sm:grid-cols-[52px_1fr_auto] sm:items-center sm:gap-6 sm:py-7">
                    <span className="grid size-12 place-items-center rounded-xl" style={{ backgroundColor: skill.tint, color: skill.ink }}><Icon aria-hidden="true" size={20} strokeWidth={1.8} /></span>
                    <div>
                      <h3 className="text-lg font-semibold tracking-[-.02em]">IELTS {skill.name}</h3>
                      <p className="mt-1.5 max-w-[48ch] text-sm leading-6 text-[#666580]">{skill.detail}</p>
                    </div>
                    <span className="text-xs font-medium text-[#77768F] sm:text-right">{["Listen closely", "Read strategically", "Write thoughtfully", "Speak naturally"][index]}</span>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="page-shell py-24 sm:py-28">
          <div className="max-w-[720px]">
            <p className="eyebrow mb-4">How it works</p>
            <h2 className="display-font section-title">A little structure goes a long way.</h2>
          </div>
          <div className="mt-12 grid gap-9 border-t border-[#E8E8F0] pt-8 md:grid-cols-3 md:gap-12">
            {[
              { title: "Create your account", body: "Set up your personal space for IELTS preparation." },
              { title: "Choose a skill", body: "Start with Listening, Reading, Writing, or Speaking." },
              { title: "Keep building", body: "Return to your dashboard and continue at your pace." },
            ].map((step, index) => (
              <article key={step.title} className="relative">
                <p className="text-sm font-semibold text-[#7047FF]">Step {index + 1}</p>
                <h3 className="mt-3 text-xl font-semibold tracking-[-.025em]">{step.title}</h3>
                <p className="mt-2 max-w-[34ch] text-sm leading-6 text-[#666580]">{step.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="about" className="page-shell pb-24 sm:pb-28">
          <div className="relative overflow-hidden rounded-[1.75rem] bg-[#24213D] px-7 py-12 text-white sm:px-12 sm:py-14 lg:px-16">
            <div aria-hidden="true" className="absolute -right-16 -top-24 size-72 rounded-full border border-white/10" />
            <div aria-hidden="true" className="absolute -right-2 -top-12 size-48 rounded-full border border-white/10" />
            <div className="relative max-w-[700px]">
              <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#BDB2FF]">Your next chapter starts now</p>
              <h2 className="display-font mt-4 text-4xl leading-tight tracking-[-.035em] sm:text-5xl">Make room for the progress you came to make.</h2>
              <p className="mt-4 max-w-[56ch] leading-7 text-white/70">Create your account and find a clear starting point for your IELTS preparation.</p>
              <Link href="/register" className="mt-7 inline-flex min-h-12 items-center gap-3 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#24213D] transition hover:bg-[#F1ECFF]">Start learning <ArrowRight aria-hidden="true" size={17} /></Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
