"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { startPipelineAttempt } from "@/features/hiringPipelines/actions"
import { errorToast } from "@/lib/errorToast"
import { Loader2Icon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

export function StartPipelineDialog({
  pipelineId,
  jobInfoId,
  pipelineName,
}: {
  pipelineId: string
  jobInfoId: string
  pipelineName: string
}) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [isPending, setIsPending] = useState(false)
  const router = useRouter()

  async function handleStart() {
    if (file == null) {
      return errorToast("Please upload your resume first")
    }

    setIsPending(true)
    const res = await startPipelineAttempt({
      pipelineId,
      jobInfoId,
      resumeFile: file,
    })
    setIsPending(false)

    if (res.error) {
      return errorToast(res.message)
    }

    setOpen(false)
    router.push(`/app/job-infos/${jobInfoId}/pipelines/${res.id}`)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Start</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Start: {pipelineName}</DialogTitle>
        <p className="text-muted-foreground text-sm">
          Upload your resume to begin. This will be used to ask you relevant
          questions about your projects and experience during the technical
          and behavioral rounds.
        </p>
        <Input
          type="file"
          accept=".pdf,.doc,.docx,.txt"
          onChange={e => setFile(e.target.files?.[0] ?? null)}
        />
        <Button onClick={handleStart} disabled={isPending}>
          {isPending ? (
            <Loader2Icon className="animate-spin" />
          ) : (
            "Begin Attempt"
          )}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
