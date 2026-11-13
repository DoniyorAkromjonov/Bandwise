import { z } from "zod";

export const mockTestSchema = z.object({
  skill: z.enum(["READING", "LISTENING"]),
  title: z.string().trim().min(3).max(200),
  sourceSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120),
  duration: z.number().int().min(1).max(720),
  isPublished: z.boolean(),
});
