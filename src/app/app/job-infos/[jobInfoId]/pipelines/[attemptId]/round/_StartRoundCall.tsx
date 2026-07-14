"use client"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { MarkdownRenderer } from "@/components/MarkdownRenderer"
import { env } from "@/data/env/client"
import { JobInfoTable } from "@/drizzle/schema"
import { updateInterview } from "@/features/interviews/actions"
import {
  completeCurrentPipelineRound,
  startPipelineRound,
} from "@/features/hiringPipelines/actions"
import { errorToast } from "@/lib/errorToast"
import { CondensedMessages } from "@/services/hume/components/CondensedMessages"
import { condenseChatMessages } from "@/services/hume/lib/condenseChatMessages"
import { useVoice, VoiceReadyState } from "@humeai/voice-react"
import { Loader2Icon, MicIcon, MicOffIcon, PhoneOffIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"

export function StartRoundCall({
  jobInfo,
  user,
  accessToken,
  pipelineAttemptId,
  pipelineRoundId,
  roundType,
  roundInstructions,
  resumeSummary,
}: {
  accessToken: string
  jobInfo: Pick<
    typeof JobInfoTable.$inferSelect,
    "id" | "title" | "description" | "experienceLevel"
  >
  user: {
    name: string
    imageUrl: string
  }
  pipelineAttemptId: string
  pipelineRoundId: string
  roundType: string
  roundInstructions: string
  resumeSummary: string
}) {
  const { connect, readyState, chatMetadata, callDurationTimestamp } =
    useVoice()
  const [interviewId, setInterviewId] = useState<string | null>(null)
  const [questionText, setQuestionText] = useState<string | null>(null)
  const [notes, setNotes] = useState("")
  const notesRef = useRef(notes)
  const durationRef = useRef(callDurationTimestamp)
  const completingRef = useRef(false)
  const router = useRouter()
  durationRef.current = callDurationTimestamp
  notesRef.current = notes

  const showNotesArea = roundType === "dsa_screen" || roundType === "technical"
  const progressPath = `/app/job-infos/${jobInfo.id}/pipelines/${pipelineAttemptId}`

  // Sync chat ID
  useEffect(() => {
    if (chatMetadata?.chatId == null || interviewId == null) {
      return
    }
    updateInterview(interviewId, { humeChatId: chatMetadata.chatId })
  }, [chatMetadata?.chatId, interviewId])

  // Sync duration
  useEffect(() => {
    if (interviewId == null) return
    const intervalId = setInterval(() => {
      if (durationRef.current == null) return

      updateInterview(interviewId, { duration: durationRef.current })
    }, 10000)

    return () => clearInterval(intervalId)
  }, [interviewId])

  // Handle disconnect: score the round, advance/reject, then go back to progress page
  useEffect(() => {
    if (readyState !== VoiceReadyState.CLOSED) return
    if (interviewId == null) {
      return router.push(progressPath)
    }
    if (completingRef.current) return
    completingRef.current = true

    async function finish(id: string) {
      if (durationRef.current != null) {
        await updateInterview(id, { duration: durationRef.current })
      }
      const res = await completeCurrentPipelineRound({
        pipelineAttemptId,
        notes: notesRef.current || undefined,
      })
      if (res.error) {
        errorToast(res.message)
      }
      router.push(progressPath)
    }

    finish(interviewId)
  }, [interviewId, readyState, router, progressPath, pipelineAttemptId])

  if (readyState === VoiceReadyState.IDLE) {
    return (
      <div className="flex justify-center items-center h-screen-header">
        <Button
          size="lg"
          onClick={async () => {
            const res = await startPipelineRound({
              pipelineAttemptId,
              pipelineRoundId,
            })
            if (res.error) {
              return errorToast(res.message)
            }
            setInterviewId(res.interviewId)
            setQuestionText(res.question)

            connect({
              auth: { type: "accessToken", value: accessToken },
              configId: env.NEXT_PUBLIC_HUME_CONFIG_ID,
              sessionSettings: {
                type: "session_settings",
                variables: {
                  userName: user.name,
                  title: jobInfo.title || "Not Specified",
                  description: jobInfo.description,
                  experienceLevel: jobInfo.experienceLevel,
                  roundInstructions,
                  resumeSummary,
                  dsaQuestion: res.question || "",
                },
              },
            })
          }}
        >
          Start Round
        </Button>
      </div>
    )
  }

  if (
    readyState === VoiceReadyState.CONNECTING ||
    readyState === VoiceReadyState.CLOSED
  ) {
    return (
      <div className="h-screen-header flex items-center justify-center">
        <Loader2Icon className="animate-spin size-24" />
      </div>
    )
  }

  return (
    <div className="overflow-y-auto h-screen-header flex flex-col-reverse">
      <div className="container py-6 flex flex-col items-center justify-end gap-4">
        {questionText != null && (
          <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 rounded border p-4">
              <div className="text-sm font-medium text-muted-foreground">
                Your Question
              </div>
              <MarkdownRenderer>{questionText}</MarkdownRenderer>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">
                Write your code / pseudocode here (talk through brute force,
                a better approach, and the optimal solution out loud too)
              </div>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="function example() { ... }"
                className="font-mono min-h-64"
              />
            </div>
          </div>
        )}
        {questionText == null && showNotesArea && (
          <div className="w-full max-w-5xl space-y-2">
            <div className="text-sm font-medium text-muted-foreground">
              Write your code / pseudocode here (optional - talk through your
              approach out loud too)
            </div>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="function example() { ... }"
              className="font-mono min-h-40"
            />
          </div>
        )}
        <Messages user={user} />
        <Controls />
      </div>
    </div>
  )
}

function Messages({ user }: { user: { name: string; imageUrl: string } }) {
  const { messages, fft } = useVoice()

  const condensedMessages = useMemo(() => {
    return condenseChatMessages(messages)
  }, [messages])

  return (
    <CondensedMessages
      messages={condensedMessages}
      user={user}
      maxFft={Math.max(...fft)}
      className="max-w-5xl"
    />
  )
}

function Controls() {
  const { disconnect, isMuted, mute, unmute, micFft, callDurationTimestamp } =
    useVoice()

  return (
    <div className="flex gap-5 rounded border px-5 py-2 w-fit sticky bottom-6 bg-background items-center">
      <Button
        variant="ghost"
        size="icon"
        className="-mx-3"
        onClick={() => (isMuted ? unmute() : mute())}
      >
        {isMuted ? <MicOffIcon className="text-destructive" /> : <MicIcon />}
        <span className="sr-only">{isMuted ? "Unmute" : "Mute"}</span>
      </Button>
      <div className="self-stretch">
        <FftVisualizer fft={micFft} />
      </div>
      <div className="text-sm text-muted-foreground tabular-nums">
        {callDurationTimestamp}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="-mx-3"
        onClick={disconnect}
      >
        <PhoneOffIcon className="text-destructive" />
        <span className="sr-only">End Call</span>
      </Button>
    </div>
  )
}

function FftVisualizer({ fft }: { fft: number[] }) {
  return (
    <div className="flex gap-1 items-center h-full">
      {fft.map((value, index) => {
        const percent = (value / 4) * 100
        return (
          <div
            key={index}
            className="min-h-0.5 bg-primary/75 w-0.5 rounded"
            style={{ height: `${percent < 10 ? 0 : percent}%` }}
          />
        )
      })}
    </div>
  )
}