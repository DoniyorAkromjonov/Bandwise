import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getServerSession } from "next-auth";
import { ArrowRight, BookOpen, Clock3, Headphones, Mic2, NotebookPen, ScanText, Sparkles } from "lucide-react";
import { authOptions } from "@/../auth";
import { Brand } from "@/components/layout/brand";
import { SignOutButton } from "@/components/dashboard/sign-out-button";

export const metadata: Metadata = { title: "Your dashboard" };
export const instant = false;

const skillCards = [
  { name: "Listening", icon: Headphones, note: "Train your ear for detail and meaning.", tone: "#E7FAFF", ink: "#007D93" },
  { name: "Reading", icon: ScanText, note: "Explore texts and build reading strategies.", tone: "#F1ECFF", ink: "#6843E8" },
  { name: "Writing", icon: NotebookPen, note: "Practice organizing and expressing ideas.", tone: "#FFF3E6", ink: "#A65C19" },
  { name: "Speaking", icon: Mic2, note: "Build confidence expressing your ideas.", tone: "#EAF7EF", ink: "#31794E" },
];

export default async function DashboardPage() {
  await connection();
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const name = session.user.name?.trim().split(/\s+/)[0] || "there";

  return (
    <main className="min-h-screen bg-[#FAFAFC]">
      <header className="border-b border-[#E8E8F0] bg-white">
        <div className="page-shell flex h-[72px] items-center justify-between gap-4">
          <Brand />
          <div className="flex items-center gap-3"><span className="hidden text-sm text-[#666580] sm:inline">{session.user.name}</span><SignOutButton /></div>
        </div>
      </header>
      <div className="page-shell py-10 sm:py-14">
        <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">Your learning space</p>
            <h1 className="display-font mt-3 text-4xl tracking-[-.035em] sm:text-5xl">Welcome, {name}.</h1>
            <p className="mt-3 max-w-[58ch] leading-7 text-[#666580]">Choose a skill to explore. Your learning journey will take shape as you practice.</p>
          </div>
          <Link href="/#skills" className="inline-flex min-h-11 items-center gap-2 self-start rounded-xl bg-[#7047FF] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#5D35EB] sm:self-auto">Explore IELTS practice <ArrowRight aria-hidden="true" size={16} /></Link>
        </section>

        <section aria-labelledby="skill-heading" className="mt-11">
          <div className="mb-5 flex items-end justify-between gap-4"><div><p className="eyebrow">Your practice</p><h2 id="skill-heading" className="mt-2 text-2xl font-semibold tracking-[-.03em]">Explore a skill</h2></div><span className="hidden text-sm text-[#77768F] sm:inline">Four parts of the IELTS test</span></div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {skillCards.map((skill) => {
              const Icon = skill.icon;
              return (
                <article key={skill.name} className="flex min-h-[228px] flex-col rounded-2xl border border-[#E8E8F0] bg-white p-5 transition hover:border-[#D6D0EA] hover:shadow-[0_18px_44px_-36px_rgba(36,33,61,.38)] sm:p-6">
                  <span className="grid size-11 place-items-center rounded-xl" style={{ backgroundColor: skill.tone, color: skill.ink }}><Icon aria-hidden="true" size={19} strokeWidth={1.8} /></span>
                  <h3 className="mt-5 text-lg font-semibold tracking-[-.02em]">IELTS {skill.name}</h3>
                  <p className="mt-2 flex-1 text-sm leading-6 text-[#666580]">{skill.note}</p>
                  <button type="button" disabled title="Practice activities will be available here soon." className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-lg border border-[#E8E8F0] bg-[#FAFAFC] px-3.5 text-sm font-semibold text-[#85839A] disabled:cursor-not-allowed disabled:opacity-80">Start practice <ArrowRight aria-hidden="true" size={15} /></button>
                </article>
              );
            })}
          </div>
        </section>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <section aria-labelledby="progress-heading" className="rounded-2xl border border-[#E8E8F0] bg-white p-6 lg:col-span-1">
            <div className="flex items-center justify-between gap-3"><h2 id="progress-heading" className="text-base font-semibold">Learning progress</h2><Sparkles aria-hidden="true" size={17} className="text-[#7047FF]" /></div>
            <div className="mt-6 grid min-h-[130px] place-items-center rounded-xl bg-[#FAFAFC] px-5 py-6 text-center">
              <div><span className="mx-auto grid size-10 place-items-center rounded-full bg-white text-[#7047FF]"><BookOpen aria-hidden="true" size={18} /></span><p className="mt-3 text-sm font-medium">Your progress will appear here.</p><p className="mt-1 text-xs leading-5 text-[#77768F]">Start practicing to see what you have worked on.</p></div>
            </div>
          </section>
          <section aria-labelledby="activity-heading" className="rounded-2xl border border-[#E8E8F0] bg-white p-6 lg:col-span-1">
            <div className="flex items-center justify-between gap-3"><h2 id="activity-heading" className="text-base font-semibold">Recent activity</h2><Clock3 aria-hidden="true" size={17} className="text-[#00A0BB]" /></div>
            <div className="mt-6 grid min-h-[130px] place-items-center rounded-xl bg-[#FAFAFC] px-5 py-6 text-center"><div><p className="text-sm font-medium">Nothing here yet.</p><p className="mt-1 text-xs leading-5 text-[#77768F]">Your completed practice will show up here.</p></div></div>
          </section>
          <section aria-labelledby="next-step-heading" className="rounded-2xl border border-[#DED8F2] bg-[#F7F5FF] p-6 lg:col-span-1">
            <p className="eyebrow">Recommended next step</p>
            <h2 id="next-step-heading" className="mt-3 text-base font-semibold">Choose a skill to begin.</h2>
            <p className="mt-2 text-sm leading-6 text-[#666580]">Pick the part of IELTS you want to focus on first. You can explore the rest whenever you are ready.</p>
            <Link href="/#skills" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#5F45CC] hover:text-[#442BB5]">Explore the four skills <ArrowRight aria-hidden="true" size={15} /></Link>
          </section>
        </div>
      </div>
    </main>
  );
}
