import { getCurrentUser } from "@/services/clerk/lib/getCurrentUser"

export async function canStartPipelineAttempt() {
  const { userId } = await getCurrentUser()
  return userId != null
}