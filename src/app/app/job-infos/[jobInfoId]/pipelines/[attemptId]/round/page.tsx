import { Loader2Icon } from "lucide-react"
import { Suspense } from "react"
import { notFound, redirect } from "next/navigation"
import { fetchAccessToken } from "hume"
import { env } from "@/data/env/server"
import { VoiceProvider } from "@humeai/voice-react"
import { getCurrentUser } from "@/services/clerk/lib/getCurrentUser"
import { getPipelineAttempt } from "@/features/hiringPipelines/actions"
import { StartRoundCall } from "./_StartRoundCall"

export default async function PipelineRoundPage({
  params,
}: {
  params: Promise<{ jobInfoId: string; attemptId: string }>
}) {
  const { jobInfoId, attemptId } = await params
  return (
    <Suspense
      fallback={
        <div className="h-screen-header flex items-center justify-center">
          <Loader2Icon className="animate-spin size-24" />
        </div>
      }
    >
      <SuspendedComponent jobInfoId={jobInfoId} attemptId={attemptId} />
    </Suspense>
  )
}

async function SuspendedComponent({
  jobInfoId,
  attemptId,
}: {
  jobInfoId: string
  attemptId: string
}) {
  const { userId, redirectToSignIn, user } = await getCurrentUser({
    allData: true,
  })
  if (userId == null || user == null) return redirectToSignIn()

  const attempt = await getPipelineAttempt(attemptId, userId)
  if (attempt == null || attempt.jobInfo.id !== jobInfoId) return notFound()

  if (attempt.status !== "in_progress") {
    redirect(`/app/job-infos/${jobInfoId}/pipelines/${attemptId}`)
  }

  const round = attempt.pipeline.rounds.find(
    r => r.order === attempt.currentRoundOrder
  )
  if (round == null) {
    redirect(`/app/job-infos/${jobInfoId}/pipelines/${attemptId}`)
  }

  const accessToken = await fetchAccessToken({
    apiKey: env.HUME_API_KEY,
    secretKey: env.HUME_SECRET_KEY,
  })

  return (
    <VoiceProvider>
      <StartRoundCall
        jobInfo={attempt.jobInfo}
        user={user}
        accessToken={accessToken}
        pipelineAttemptId={attempt.id}
        pipelineRoundId={round!.id}
        roundType={round!.roundType}
        roundInstructions={round!.systemPromptAddition}
        resumeSummary={attempt.resumeSummary}
      />
    </VoiceProvider>
  )
}
