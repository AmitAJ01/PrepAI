import { getGlobalTag, getIdTag, getUserTag } from "@/lib/dataCache"
import { revalidateTag } from "next/cache"

// Pipelines (global templates - no per-user/job-info scoping needed)
export function getPipelineGlobalTag() {
  return getGlobalTag("hiringPipelines")
}

export function getPipelineIdTag(id: string) {
  return getIdTag("hiringPipelines", id)
}

export function revalidatePipelineCache(id: string) {
  revalidateTag(getPipelineGlobalTag())
  revalidateTag(getPipelineIdTag(id))
}

// Pipeline attempts (per user)
export function getPipelineAttemptGlobalTag() {
  return getGlobalTag("pipelineAttempts")
}

export function getPipelineAttemptUserTag(userId: string) {
  return getUserTag("pipelineAttempts", userId)
}

export function getPipelineAttemptIdTag(id: string) {
  return getIdTag("pipelineAttempts", id)
}

export function revalidatePipelineAttemptCache({
  id,
  userId,
}: {
  id: string
  userId: string
}) {
  revalidateTag(getPipelineAttemptGlobalTag())
  revalidateTag(getPipelineAttemptUserTag(userId))
  revalidateTag(getPipelineAttemptIdTag(id))
}