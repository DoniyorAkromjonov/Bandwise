import type { Prisma } from "@/generated/prisma/client";

export const adminUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  xp: true,
  streak: true,
  createdAt: true,
  lastActivityDate: true,
  _count: {
    select: {
      readingTestAttempts: true,
      listeningAttempts: true,
      mockTests: true,
      vocabulary: true,
      achievements: true,
    },
  },
} satisfies Prisma.UserSelect;
