import { db } from "@/drizzle/db"
import {
  HiringPipelineTable,
  PipelineAttemptTable,
  RoundAttemptTable,
} from "@/drizzle/schema"
import { eq } from "drizzle-orm"
import { revalidatePipelineAttemptCache } from "./dbCache"

export async function insertPipelineAttempt(
  attempt: typeof PipelineAttemptTable.$inferInsert
) {
  const [newAttempt] = await db
    .insert(PipelineAttemptTable)
    .values(attempt)
    .returning({
      id: PipelineAttemptTable.id,
      userId: PipelineAttemptTable.userId,
    })

  revalidatePipelineAttemptCache(newAttempt)

  return newAttempt
}

export async function updatePipelineAttempt(
  id: string,
  attempt: Partial<typeof PipelineAttemptTable.$inferInsert>
) {
  const [updatedAttempt] = await db
    .update(PipelineAttemptTable)
    .set(attempt)
    .where(eq(PipelineAttemptTable.id, id))
    .returning({
      id: PipelineAttemptTable.id,
      userId: PipelineAttemptTable.userId,
    })

  revalidatePipelineAttemptCache(updatedAttempt)

  return updatedAttempt
}

export async function insertRoundAttempt(
  roundAttempt: typeof RoundAttemptTable.$inferInsert
) {
  const [newRoundAttempt] = await db
    .insert(RoundAttemptTable)
    .values(roundAttempt)
    .returning({
      id: RoundAttemptTable.id,
      pipelineAttemptId: RoundAttemptTable.pipelineAttemptId,
    })

  return newRoundAttempt
}

export async function updateRoundAttempt(
  id: string,
  roundAttempt: Partial<typeof RoundAttemptTable.$inferInsert>
) {
  const [updatedRoundAttempt] = await db
    .update(RoundAttemptTable)
    .set(roundAttempt)
    .where(eq(RoundAttemptTable.id, id))
    .returning({
      id: RoundAttemptTable.id,
      pipelineAttemptId: RoundAttemptTable.pipelineAttemptId,
    })

  return updatedRoundAttempt
}