import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getServerSession } from "next-auth";
import { ArrowRight, Clock3, Headphones, Mic2, NotebookPen, ScanText, Sparkles } from "lucide-react";
import { authOptions } from "@/../auth";
import { Brand } from "@/components/layout/brand";
import { AdminPanelLink } from "@/components/admin/admin-panel-link";
import { SignOutButton } from "@/components/dashboard/sign-out-button";
import { ThemeSettings } from "@/components/theme/theme-settings";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Your dashboard" };
export const instant = false;

const skillCards = [
  { name: "Listening", icon: Headphones, note: "Train your ear for detail and meaning.", tone: "bg-[#E7FAFF] text-[#007D93] dark:bg-[#25363D] dark:text-[#A8D6DC]" },
  { name: "Reading", icon: ScanText, note: "Explore texts and build reading strategies.", tone: "bg-[#F1ECFF] text-[#6843E8] dark:bg-[#302B42] dark:text-[#C9B9EF]" },
  { name: "Writing", icon: NotebookPen, note: "Practice organizing and expressing ideas.", tone: "bg-[#FFF3E6] text-[#A65C19] dark:bg-[#3E352B] dark:text-[#D6B68E]" },
  { name: "Speaking", icon: Mic2, note: "Build confidence expressing your ideas.", tone: "bg-[#EAF7EF] text-[#31794E] dark:bg-[#29382F] dark:text-[#A8CFB2]" },
];

type DashboardActivity = {
  id: string;
  title: string;
  detail: string;
  href: string;
  occurredAt: Date;
};

const activityDate = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" });

export default async function DashboardPage() {
  await connection();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;
  const [profile, completedReadingCount, listeningAttemptCount, completedMockTestCount, savedReading, readingAttempts, listeningAttempts, mockTests, exerciseAttempts] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { role: true, xp: true, streak: true, lastActivityDate: true } }),
    prisma.readingProgress.count({ where: { userId, completed: true } }),
    prisma.listeningAttempt.count({ where: { userId } }),
    prisma.mockTest.count({ where: { userId, status: "COMPLETED" } }),
    prisma.readingProgress.findMany({
      where: { userId, completed: false },
      orderBy: { lastReadAt: "desc" },
      take: 3,
      select: { id: true, lastReadAt: true, timeSpent: true, article: { select: { title: true, slug: true } } },
    }),
    prisma.readingTestAttempt.findMany({
      where: { userId },
      orderBy: { submittedAt: "desc" },
      take: 5,
      select: { id: true, score: true, questionCount: true, submittedAt: true, article: { select: { title: true, slug: true } } },
    }),
    prisma.listeningAttempt.findMany({
      where: { userId },
      orderBy: { submittedAt: "desc" },
      take: 5,
      select: { id: true, score: true, questionCount: true, submittedAt: true, material: { select: { title: true, slug: true } } },
    }),
    prisma.mockTest.findMany({
      where: { userId, status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      take: 5,
      select: { id: true, title: true, skill: true, score: true, questionCount: true, completedAt: true, startedAt: true },
    }),
    prisma.exerciseAttempt.count({ where: { userId } }),
  ]);
  const recentActivity: DashboardActivity[] = [
    ...savedReading.map((item) => ({
      id: `reading-progress-${item.id}`,
      title: item.article.title,
      detail: item.timeSpent > 0 ? `Reading in progress · ${Math.ceil(item.timeSpent / 60)} min` : "Reading in progress · Resume where you left off",
      href: `/dashboard/reading/${item.article.slug}/practice`,
      occurredAt: item.lastReadAt,
    })),
    ...readingAttempts.map((attempt) => ({
      id: `reading-attempt-${attempt.id}`,
      title: attempt.article.title,
      detail: `Reading · ${attempt.score}/${attempt.questionCount}`,
      href: `/dashboard/reading/${attempt.article.slug}/practice`,
      occurredAt: attempt.submittedAt,
    })),
    ...listeningAttempts.map((attempt) => ({
      id: `listening-attempt-${attempt.id}`,
      title: attempt.material.title,
      detail: `Listening · ${attempt.score}/${attempt.questionCount}`,
      href: `/dashboard/listening/${attempt.material.slug}`,
      occurredAt: attempt.submittedAt,
    })),
    ...mockTests.map((test) => ({
      id: `mock-test-${test.id}`,
      title: test.title,
      detail: `${test.skill === "READING" ? "Reading" : "Listening"} mock test · ${test.score ?? 0}/${test.questionCount ?? 0}`,
      href: "/dashboard/mock-tests",
      occurredAt: test.completedAt ?? test.startedAt,
    })),
  ].sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime()).slice(0, 5);
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  const lastActivity = profile?.lastActivityDate ? new Date(profile.lastActivityDate) : null; lastActivity?.setUTCHours(0, 0, 0, 0);
  const activeStreak = lastActivity && lastActivity.getTime() >= today.getTime() - 86_400_000 ? profile?.streak ?? 0 : 0;
  const name = session.user.name?.trim().split(/\s+/)[0] || "there";

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="page-shell flex h-[68px] items-center justify-between gap-2 sm:h-[72px] sm:gap-4">
          <Brand />
          <div className="flex shrink-0 items-center gap-2 sm:gap-3"><span className="hidden max-w-36 truncate text-sm text-muted-foreground sm:inline">{session.user.name}</span>{profile?.role === "ADMIN" && <AdminPanelLink />}<ThemeSettings /><SignOutButton /></div>
        </div>
      </header>
      <div className="page-shell py-10 sm:py-14">
        <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">Your learning space</p>
            <h1 className="display-font mt-3 text-4xl tracking-[-.035em] sm:text-5xl">Welcome, {name}.</h1>
            <p className="mt-3 max-w-[58ch] leading-7 text-muted-foreground">Choose a skill to explore. Your learning journey will take shape as you practice.</p>
          </div>
          <div className="flex flex-wrap gap-3"><Link href="/dashboard/mock-tests" className="inline-flex min-h-11 items-center gap-2 self-start rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary/90">Start a mock test <ArrowRight aria-hidden="true" size={16} /></Link><Link href="/dashboard/vocabulary" className="inline-flex min-h-11 items-center gap-2 self-start rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold transition hover:bg-secondary">My vocabulary</Link><Link href="/dashboard/achievements" className="inline-flex min-h-11 items-center gap-2 self-start rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold transition hover:bg-secondary">Achievements · {profile?.xp ?? 0} XP · {activeStreak} day streak</Link><Link href="/#skills" className="inline-flex min-h-11 items-center gap-2 self-start rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold transition hover:bg-secondary">Explore IELTS practice <ArrowRight aria-hidden="true" size={16} /></Link></div>
        </section>

        <section aria-labelledby="skill-heading" className="mt-11">
          <div className="mb-5 flex items-end justify-between gap-4"><div><p className="eyebrow">Your practice</p><h2 id="skill-heading" className="mt-2 text-2xl font-semibold tracking-[-.03em]">Explore a skill</h2></div><span className="hidden text-sm text-muted-foreground sm:inline">Four parts of the IELTS test</span></div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {skillCards.map((skill) => {
              const Icon = skill.icon;
              return (
                <article key={skill.name} className="flex min-h-[228px] flex-col rounded-2xl border border-border bg-card p-5 transition hover:border-primary/40 hover:shadow-[0_18px_44px_-36px_rgba(36,33,61,.38)] sm:p-6">
                  <span className={`grid size-11 place-items-center rounded-xl ${skill.tone}`}><Icon aria-hidden="true" size={19} strokeWidth={1.8} /></span>
                  <h3 className="mt-5 text-lg font-semibold tracking-[-.02em]">IELTS {skill.name}</h3>
                  <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">{skill.note}</p>
                  {skill.name === "Reading" || skill.name === "Listening" ? <Link href={`/dashboard/${skill.name.toLowerCase()}`} className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-lg border border-border bg-secondary px-3.5 text-sm font-semibold text-secondary-foreground transition hover:border-primary">Start practice <ArrowRight aria-hidden="true" size={15} /></Link> : <button type="button" disabled title="Practice activities will be available here soon." className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-lg border border-border bg-background px-3.5 text-sm font-semibold text-muted-foreground disabled:cursor-not-allowed disabled:opacity-80">Start practice <ArrowRight aria-hidden="true" size={15} /></button>}
                </article>
              );
            })}
          </div>
        </section>

        <div className="mt-8 grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-3">
          <section aria-labelledby="progress-heading" className="min-w-0 rounded-2xl border border-border bg-card p-6 lg:col-span-1">
            <div className="flex items-center justify-between gap-3"><h2 id="progress-heading" className="text-base font-semibold">Learning progress</h2><Sparkles aria-hidden="true" size={17} className="text-primary" /></div>
            <div className="mt-5 grid gap-2">
              <Link href="/dashboard/reading" className="flex min-h-11 items-center justify-between gap-3 rounded-xl bg-background px-4 py-3 text-sm transition hover:bg-secondary"><span>Reading passages finished</span><strong>{completedReadingCount}</strong></Link>
              <Link href="/dashboard/listening" className="flex min-h-11 items-center justify-between gap-3 rounded-xl bg-background px-4 py-3 text-sm transition hover:bg-secondary"><span>Listening attempts</span><strong>{listeningAttemptCount}</strong></Link>
              <Link href="/dashboard/mock-tests" className="flex min-h-11 items-center justify-between gap-3 rounded-xl bg-background px-4 py-3 text-sm transition hover:bg-secondary"><span>Mock tests completed</span><strong>{completedMockTestCount}</strong></Link>
              <Link href="/dashboard/exercises" className="flex min-h-11 items-center justify-between gap-3 rounded-xl bg-background px-4 py-3 text-sm transition hover:bg-secondary"><span>Exercise attempts</span><strong>{exerciseAttempts}</strong></Link>
            </div>
          </section>
          <section aria-labelledby="activity-heading" className="min-w-0 rounded-2xl border border-border bg-card p-6 lg:col-span-1">
            <div className="flex items-center justify-between gap-3"><h2 id="activity-heading" className="text-base font-semibold">Recent activity</h2><Clock3 aria-hidden="true" size={17} className="text-accent-foreground" /></div>
            {recentActivity.length ? (
              <ul className="mt-4 divide-y divide-border">
                {recentActivity.map((activity) => (
                  <li key={activity.id}>
                    <Link href={activity.href} className="flex min-h-14 items-center justify-between gap-3 py-3">
                      <span className="min-w-0"><span className="block truncate text-sm font-medium">{activity.title}</span><span className="mt-1 block text-xs text-muted-foreground">{activity.detail}</span></span>
                      <time className="shrink-0 text-xs text-muted-foreground" dateTime={activity.occurredAt.toISOString()}>{activityDate.format(activity.occurredAt)}</time>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-6 grid min-h-[130px] place-items-center rounded-xl bg-background px-5 py-6 text-center"><div><p className="text-sm font-medium">Nothing here yet.</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Your completed practice will show up here.</p></div></div>
            )}
          </section>
          <section aria-labelledby="next-step-heading" className="min-w-0 rounded-2xl border border-border bg-secondary p-6 lg:col-span-1">
            <p className="eyebrow">Recommended next step</p>
            <h2 id="next-step-heading" className="mt-3 text-base font-semibold">Choose a skill to begin.</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Pick the part of IELTS you want to focus on first. You can explore the rest whenever you are ready.</p>
            <Link href="/#skills" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-secondary-foreground hover:text-secondary-foreground">Explore the four skills <ArrowRight aria-hidden="true" size={15} /></Link>
          </section>
        </div>
      </div>
    </main>
  );
}
