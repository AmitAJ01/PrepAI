import { BackLink } from "@/components/BackLink"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MarkdownRenderer } from "@/components/MarkdownRenderer"
import { getPipelineAttempt } from "@/features/hiringPipelines/actions"
import { getCurrentUser } from "@/services/clerk/lib/getCurrentUser"
import { CheckIcon, LockIcon, XIcon } from "lucide-react"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { cn } from "@/lib/utils"

const roundTypeLabels: Record<string, string> = {
  dsa_screen: "DSA Screen",
  technical: "Technical",
  system_design: "System Design",
  behavioral: "Behavioral",
}

export default async function PipelineAttemptPage({
  params,
}: {
  params: Promise<{ jobInfoId: string; attemptId: string }>
}) {
  const { jobInfoId, attemptId } = await params
  const { userId, redirectToSignIn } = await getCurrentUser()
  if (userId == null) return redirectToSignIn()

  const attempt = await getPipelineAttempt(attemptId, userId)
  if (attempt == null || attempt.jobInfo.id !== jobInfoId) return notFound()

  return (
    <div className="container my-4 space-y-6">
      <BackLink href={`/app/job-infos/${jobInfoId}/pipelines`}>
        All Pipelines
      </BackLink>

      <div className="space-y-2">
        <h1 className="text-3xl md:text-4xl">{attempt.pipeline.name}</h1>
        <Badge
          variant={
            attempt.status === "passed"
              ? "default"
              : attempt.status === "rejected"
                ? "destructive"
                : "secondary"
          }
        >
          {attempt.status === "in_progress"
            ? "In Progress"
            : attempt.status === "passed"
              ? "Offer!"
              : "Not This Time"}
        </Badge>
      </div>

      <div className="space-y-3">
        {attempt.pipeline.rounds.map(round => {
          const roundAttempt = attempt.roundAttempts.find(
            ra => ra.pipelineRoundId === round.id
          )
          const isCurrent =
            attempt.status === "in_progress" &&
            round.order === attempt.currentRoundOrder
          const isLocked = round.order > attempt.currentRoundOrder

          return (
            <div
              key={round.id}
              className={cn(
                "flex items-center justify-between gap-4 rounded border p-4",
                isCurrent && "border-primary"
              )}
            >
              <div className="flex items-center gap-3">
                <div>
                  {roundAttempt?.passed === true && (
                    <CheckIcon className="text-primary" />
                  )}
                  {roundAttempt?.passed === false && (
                    <XIcon className="text-destructive" />
                  )}
                  {roundAttempt?.passed == null && isLocked && (
                    <LockIcon className="text-muted-foreground" />
                  )}
                </div>
                <div>
                  <div className="font-medium">
                    Round {round.order}:{" "}
                    {roundTypeLabels[round.roundType] ?? round.roundType}
                  </div>
                  {roundAttempt?.score != null && (
                    <div className="text-sm text-muted-foreground">
                      Score: {roundAttempt.score}/100 (needed{" "}
                      {round.passThreshold})
                    </div>
                  )}
                </div>
              </div>

              {isCurrent && (
                <Button asChild>
                  <Link
                    href={`/app/job-infos/${jobInfoId}/pipelines/${attemptId}/round`}
                  >
                    Start Round
                  </Link>
                </Button>
              )}
            </div>
          )
        })}
      </div>

      {attempt.finalReport != null && (
        <div className="space-y-2 pt-4 border-t">
          <h2 className="text-2xl">Your Report</h2>
          <MarkdownRenderer>{attempt.finalReport}</MarkdownRenderer>
        </div>
      )}
    </div>
  )
}
