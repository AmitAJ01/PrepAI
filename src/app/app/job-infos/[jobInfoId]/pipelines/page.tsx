import { BackLink } from "@/components/BackLink"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  getPipelineAttemptsForJobInfo,
  getPipelines,
} from "@/features/hiringPipelines/actions"
import { getCurrentUser } from "@/services/clerk/lib/getCurrentUser"
import { formatDateTime } from "@/lib/formatters"
import Link from "next/link"
import { StartPipelineDialog } from "./_StartPipelineDialog"

export default async function PipelinesPage({
  params,
}: {
  params: Promise<{ jobInfoId: string }>
}) {
  const { jobInfoId } = await params
  const { userId, redirectToSignIn } = await getCurrentUser()
  if (userId == null) return redirectToSignIn()

  const [pipelines, attempts] = await Promise.all([
    getPipelines(),
    getPipelineAttemptsForJobInfo(jobInfoId, userId),
  ])

  return (
    <div className="container my-4 space-y-6">
      <BackLink href={`/app/job-infos/${jobInfoId}`}>Job Info</BackLink>

      <div className="space-y-2">
        <h1 className="text-3xl md:text-4xl">Hiring Pipelines</h1>
        <p className="text-muted-foreground">
          Simulate a real multi-round hiring process for this job. Clear each
          round to advance - fail one, and the attempt ends there, just like
          a real interview loop.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {pipelines.map(pipeline => (
          <Card key={pipeline.id}>
            <CardHeader>
              <CardTitle>{pipeline.name}</CardTitle>
              <CardDescription>{pipeline.exampleCompanies}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Badge variant="secondary">
                {pipeline.rounds.length} rounds
              </Badge>
              <div>
                <StartPipelineDialog
                  pipelineId={pipeline.id}
                  jobInfoId={jobInfoId}
                  pipelineName={pipeline.name}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {attempts.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl">Your Attempts</h2>
          <div className="space-y-2">
            {attempts.map(attempt => (
              <Link
                key={attempt.id}
                href={`/app/job-infos/${jobInfoId}/pipelines/${attempt.id}`}
                className="block"
              >
                <Card className="flex-row items-center justify-between p-4">
                  <div>
                    <div className="font-medium">
                      {attempt.pipeline.name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatDateTime(attempt.createdAt)}
                    </div>
                  </div>
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
                        ? "Passed"
                        : "Rejected"}
                  </Badge>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
