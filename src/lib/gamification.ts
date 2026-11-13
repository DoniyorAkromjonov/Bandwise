import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const definitions = [
  { key: "first_reading", name: "First Steps", description: "Complete your first Reading practice.", icon: "📖", xpReward: 25, threshold: 1, metric: "reading" },
  { key: "reading_five", name: "Page Turner", description: "Complete five Reading practices.", icon: "📚", xpReward: 60, threshold: 5, metric: "reading" },
  { key: "first_listening", name: "Sharp Ears", description: "Complete your first Listening practice.", icon: "🎧", xpReward: 25, threshold: 1, metric: "listening" },
  { key: "vocabulary_ten", name: "Word Collector", description: "Save ten vocabulary words.", icon: "📝", xpReward: 40, threshold: 10, metric: "vocabulary" },
  { key: "streak_three", name: "Consistent Learner", description: "Study on three consecutive days.", icon: "🔥", xpReward: 50, threshold: 3, metric: "streak" },
  { key: "xp_500", name: "Rising Star", description: "Earn 500 XP through practice.", icon: "⭐", xpReward: 100, threshold: 500, metric: "xp" },
];

export async function awardActivityInTransaction(tx: Prisma.TransactionClient, userId: string, source: string, amount: number) {
  for (const definition of definitions) {
    await tx.achievement.upsert({ where: { key: definition.key }, create: definition, update: definition });
  }

  const event = await tx.xpEvent.createMany({ data: { userId, source, amount }, skipDuplicates: true });
  if (!event.count) return;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { lastActivityDate: true, streak: true } });
  const lastDay = user.lastActivityDate ? new Date(user.lastActivityDate) : null;
  lastDay?.setUTCHours(0, 0, 0, 0);
  const streak = lastDay?.getTime() === today.getTime()
    ? user.streak
    : lastDay?.getTime() === today.getTime() - 86_400_000 ? user.streak + 1 : 1;

  await tx.user.update({ where: { id: userId }, data: { xp: { increment: amount }, streak, lastActivityDate: today } });
  const [reading, listening, vocabulary, updated] = await Promise.all([
    tx.readingTestAttempt.count({ where: { userId } }),
    tx.listeningAttempt.count({ where: { userId } }),
    tx.vocabularyItem.count({ where: { userId } }),
    tx.user.findUniqueOrThrow({ where: { id: userId }, select: { xp: true } }),
  ]);
  const metrics = { reading, listening, vocabulary, streak, xp: updated.xp };

  for (const definition of definitions) {
    if (metrics[definition.metric as keyof typeof metrics] < definition.threshold) continue;
    const achievement = await tx.achievement.findUniqueOrThrow({ where: { key: definition.key } });
    const awarded = await tx.userAchievement.createMany({ data: { userId, achievementId: achievement.id }, skipDuplicates: true });
    if (!awarded.count) continue;
    await tx.xpEvent.create({ data: { userId, source: `achievement:${definition.key}`, amount: achievement.xpReward } });
    await tx.user.update({ where: { id: userId }, data: { xp: { increment: achievement.xpReward } } });
  }
}

export async function ensureAchievements() {
  await Promise.all(definitions.map((definition) => prisma.achievement.upsert({
    where: { key: definition.key },
    create: definition,
    update: definition,
  })));
}
