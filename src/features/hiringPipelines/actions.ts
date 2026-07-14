"use server"

import { getCurrentUser } from "@/services/clerk/lib/getCurrentUser"
import { cacheTag } from "next/dist/server/use-cache/cache-tag"
import { db } from "@/drizzle/db"
import { and, asc, eq } from "drizzle-orm"
import {
  HiringPipelineTable,
  JobInfoTable,
  PipelineAttemptTable,
  PipelineRoundTable,
  RoundAttemptTable,
} from "@/drizzle/schema"
import {
  insertPipelineAttempt,
  insertRoundAttempt,
  updatePipelineAttempt,
  updateRoundAttempt,
} from "./db"
import {
  getPipelineAttemptIdTag,
  getPipelineAttemptUserTag,
  getPipelineGlobalTag,
} from "./dbCache"
import { canStartPipelineAttempt } from "./permissions"
import { extractResumeSummary } from "@/services/ai/resumes/extractResumeSummary"
import {
  generateFinalPipelineReport,
  scoreRoundAttempt,
} from "@/services/ai/hiringPipelines"
import { insertInterview } from "../interviews/db"
import { generateDsaQuestionFast } from "@/services/ai/hiringPipelines"
import type { QuestionDifficulty } from "@/drizzle/schema"

const experienceLevelToDifficulty: Record<string, QuestionDifficulty> = {
  junior: "easy",
  "mid-level": "medium",
  senior: "hard",
}

export async function getPipelineAttemptsForJobInfo(
  jobInfoId: string,
  userId: string
) {
  "use cache"
  cacheTag(getPipelineAttemptUserTag(userId))

  return db.query.PipelineAttemptTable.findMany({
    where: and(
      eq(PipelineAttemptTable.jobInfoId, jobInfoId),
      eq(PipelineAttemptTable.userId, userId)
    ),
    with: { pipeline: true },
    orderBy: (table, { desc }) => desc(table.createdAt),
  })
}

export async function getPipelines() {
  "use cache"
  cacheTag(getPipelineGlobalTag())

  return db.query.HiringPipelineTable.findMany({
    with: {
      rounds: {
        orderBy: asc(PipelineRoundTable.order),
      },
    },
  })
}

export async function startPipelineAttempt({
  pipelineId,
  jobInfoId,
  resumeFile,
}: {
  pipelineId: string
  jobInfoId: string
  resumeFile: File
}): Promise<{ error: true; message: string } | { error: false; id: string }> {
  const { userId } = await getCurrentUser()
  if (userId == null || !(await canStartPipelineAttempt())) {
    return { error: true, message: "You don't have permission to do this" }
  }

  const jobInfo = await getJobInfo(jobInfoId, userId)
  if (jobInfo == null) {
    return { error: true, message: "You don't have permission to do this" }
  }

  const pipeline = await db.query.HiringPipelineTable.findFirst({
    where: eq(HiringPipelineTable.id, pipelineId),
  })
  if (pipeline == null) {
    return { error: true, message: "Pipeline not found" }
  }

  const resumeSummary = await extractResumeSummary(resumeFile)
  if (resumeSummary == null || resumeSummary.trim() === "") {
    return { error: true, message: "Failed to read resume file" }
  }

  const attempt = await insertPipelineAttempt({
    userId,
    pipelineId,
    jobInfoId,
    resumeSummary,
    currentRoundOrder: 1,
    status: "in_progress",
  })

  return { error: false, id: attempt.id }
}

export async function startPipelineRound({
  pipelineAttemptId,
  pipelineRoundId,
}: {
  pipelineAttemptId: string
  pipelineRoundId: string
}): Promise<
  | { error: true; message: string }
  | { error: false; interviewId: string; question: string | null }
> {
  const { userId } = await getCurrentUser()
  if (userId == null) {
    return { error: true, message: "You don't have permission to do this" }
  }

  const attempt = await getPipelineAttempt(pipelineAttemptId, userId)
  if (attempt == null) {
    return { error: true, message: "You don't have permission to do this" }
  }

  const round = attempt.pipeline.rounds.find(r => r.id === pipelineRoundId)
  if (round == null || round.order !== attempt.currentRoundOrder) {
    return { error: true, message: "This round is not currently available" }
  }

  const interview = await insertInterview({
    jobInfoId: attempt.jobInfoId,
    duration: "00:00:00",
  })

  let question: string | null = null
  if (round.roundType === "dsa_screen") {
    const difficulty =
      experienceLevelToDifficulty[attempt.jobInfo.experienceLevel] ?? "medium"

    try {
      question = await generateDsaQuestionFast({
        jobInfo: attempt.jobInfo,
        difficulty,
      })
    } catch (error) {
      console.error("Failed to generate DSA question:", error)
      return {
        error: true,
        message:
          "Failed to generate your question. You may have hit today's AI usage limit - please try again later.",
      }
    }
  }

  await insertRoundAttempt({
    pipelineAttemptId,
    pipelineRoundId,
    interviewId: interview.id,
    question,
  })

  return { error: false, interviewId: interview.id, question }
}

export async function completeCurrentPipelineRound({
  pipelineAttemptId,
  notes,
}: {
  pipelineAttemptId: string
  notes?: string
}): Promise<{ error: true; message: string } | { error: false }> {
  const { userId, user } = await getCurrentUser({ allData: true })
  if (userId == null || user == null) {
    return { error: true, message: "You don't have permission to do this" }
  }

  const attempt = await getPipelineAttempt(pipelineAttemptId, userId)
  if (attempt == null) {
    return { error: true, message: "You don't have permission to do this" }
  }

  const round = attempt.pipeline.rounds.find(
    r => r.order === attempt.currentRoundOrder
  )
  if (round == null) {
    return { error: true, message: "Round not found" }
  }

  const roundAttempt = await db.query.RoundAttemptTable.findFirst({
    where: and(
      eq(RoundAttemptTable.pipelineAttemptId, pipelineAttemptId),
      eq(RoundAttemptTable.pipelineRoundId, round.id)
    ),
    with: { interview: true },
  })

  if (roundAttempt?.interview?.humeChatId == null) {
    return { error: true, message: "This round's interview is not complete yet" }
  }

  if (notes) {
    await updateRoundAttempt(roundAttempt.id, { notes })
  }

  let score: number
  try {
    score = await scoreRoundAttempt({
      humeChatId: roundAttempt.interview.humeChatId,
      roundType: round.roundType,
      roundInstructions: round.systemPromptAddition,
      jobInfo: attempt.jobInfo,
      question: roundAttempt.question,
      notes,
    })
  } catch (error) {
    console.error("Failed to score round attempt:", error)
    return {
      error: true,
      message:
        "Failed to score your round. You may have hit today's AI usage limit - please try again later.",
    }
  }

  const passed = score >= round.passThreshold

  await updateRoundAttempt(roundAttempt.id, { score, passed })

  const isLastRound = round.order === attempt.pipeline.rounds.length

  if (!passed) {
    await updatePipelineAttempt(pipelineAttemptId, { status: "rejected" })
    await finalizeReport(pipelineAttemptId, userId, user.name)
    return { error: false }
  }

  if (isLastRound) {
    await updatePipelineAttempt(pipelineAttemptId, { status: "passed" })
    await finalizeReport(pipelineAttemptId, userId, user.name)
    return { error: false }
  }

  await updatePipelineAttempt(pipelineAttemptId, {
    currentRoundOrder: attempt.currentRoundOrder + 1,
  })

  return { error: false }
}

async function finalizeReport(
  pipelineAttemptId: string,
  userId: string,
  userName: string
) {
  const attempt = await getPipelineAttempt(pipelineAttemptId, userId)
  if (attempt == null) return

  const roundAttempts = await db.query.RoundAttemptTable.findMany({
    where: eq(RoundAttemptTable.pipelineAttemptId, pipelineAttemptId),
    with: { pipelineRound: true, interview: true },
    orderBy: (table, { asc }) => asc(table.createdAt),
  })

  try {
    const finalReport = await generateFinalPipelineReport({
      userName,
      jobInfo: attempt.jobInfo,
      rounds: roundAttempts.map(ra => ({
        roundType: ra.pipelineRound.roundType,
        order: ra.pipelineRound.order,
        score: ra.score,
        passed: ra.passed,
        humeChatId: ra.interview?.humeChatId ?? null,
        notes: ra.notes,
        question: ra.question,
      })),
    })

    await updatePipelineAttempt(pipelineAttemptId, { finalReport })
  } catch (error) {
    console.error("Failed to generate final pipeline report:", error)
    await updatePipelineAttempt(pipelineAttemptId, {
      finalReport:
        "We couldn't generate your detailed report due to a temporary issue (possibly an AI usage limit). Your round-by-round results above are still accurate - please check back later for the full report.",
    })
  }
}

async function getJobInfo(id: string, userId: string) {
  "use cache"

  return db.query.JobInfoTable.findFirst({
    where: and(eq(JobInfoTable.id, id), eq(JobInfoTable.userId, userId)),
  })
}

export async function getPipelineAttempt(id: string, userId: string) {
  "use cache"
  cacheTag(getPipelineAttemptIdTag(id))

  const attempt = await db.query.PipelineAttemptTable.findFirst({
    where: eq(PipelineAttemptTable.id, id),
    with: {
      pipeline: {
        with: {
          rounds: {
            orderBy: asc(PipelineRoundTable.order),
          },
        },
      },
      jobInfo: {
        columns: {
          id: true,
          userId: true,
          title: true,
          description: true,
          experienceLevel: true,
        },
      },
      roundAttempts: true,
    },
  })

  if (attempt == null || attempt.userId !== userId) return null

  return attempt
}