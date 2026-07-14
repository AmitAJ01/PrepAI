import { z } from "zod"

export const roundScoreSchema = z.object({
  score: z
    .number()
    .min(0)
    .max(100)
    .describe(
      "Overall score for this round out of 100, reflecting how well the candidate performed against what a real interviewer at this stage would expect."
    ),
})