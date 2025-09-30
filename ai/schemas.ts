import { z } from "zod";

export const CoachOut = z.object({
  summary: z.string().min(30).max(420),
  top_faults: z.array(z.object({
    code: z.string(),
    why: z.string(),
    evidence: z.array(z.string()).min(1)
  })).min(1),
  drills: z.array(z.object({
    id: z.string(),
    steps: z.array(z.string()).min(1),
    reps: z.string(),
    cue: z.string(),
    contra: z.array(z.string()).optional()
  })).max(4),
  practice_plan: z.object({
    days: z.number().int().min(7).max(28),
    schedule: z.array(z.object({
      day: z.number().int().min(1),
      focus: z.array(z.string()).min(1)
    })).min(7)
  }),
  one_liner: z.string().max(140)
});
export type CoachOutT = z.infer<typeof CoachOut>;
