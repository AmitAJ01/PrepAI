import { JobInfoTable, QuestionDifficulty } from "@/drizzle/schema"
import { fetchChatMessages } from "../hume/lib/api"
import { generateText, streamObject } from "ai"
import { google } from "./models/google"
import { roundScoreSchema } from "./hiringPipelines/schemas"

export async function generateDsaQuestionFast({
  jobInfo,
  difficulty,
}: {
  jobInfo: Pick<
    typeof JobInfoTable.$inferSelect,
    "title" | "description" | "experienceLevel"
  >
  difficulty: QuestionDifficulty
}) {
  const { text } = await generateText({
    model: google("gemini-flash-lite-latest"),
    prompt: difficulty,
    system: `You are an AI assistant that creates technical interview questions tailored to a specific job role. Your task is to generate one **realistic and relevant** DSA (Data Structures & Algorithms) question that matches the skill requirements of the job and aligns with the difficulty level provided by the user.

Job Information:
- Job Description: \`${jobInfo.description}\`
- Experience Level: \`${jobInfo.experienceLevel}\`
${jobInfo.title ? `\n- Job Title: \`${jobInfo.title}\`` : ""}

Guidelines:
- The question must be a genuine DSA problem (arrays, strings, trees, graphs, dynamic programming, etc.), the kind asked in a real technical screen - not a general knowledge or trivia question.
- Make sure the question is appropriately scoped for the specified difficulty and experience level.
- A difficulty level of "easy", "medium", or "hard" is provided by the user and should be used to tailor the question.
- Return only the question itself, clearly formatted as markdown. Do not include the answer, hints, or any approach discussion - the interviewer will guide that conversation live.
- Return only one question.
- Keep it concise - a clear problem statement with any necessary constraints or examples, nothing more.`,
  })

  return text
}

function formatTranscript(
  messages: Awaited<ReturnType<typeof fetchChatMessages>>
) {
  return messages
    .map(message => {
      if (message.type !== "USER_MESSAGE" && message.type !== "AGENT_MESSAGE") {
        return null
      }
      if (message.messageText == null) return null

      return {
        speaker: message.type === "USER_MESSAGE" ? "interviewee" : "interviewer",
        text: message.messageText,
      }
    })
    .filter(f => f != null)
}

export async function scoreRoundAttempt({
  humeChatId,
  roundType,
  roundInstructions,
  jobInfo,
  question,
  notes,
}: {
  humeChatId: string
  roundType: string
  roundInstructions: string
  jobInfo: Pick<typeof JobInfoTable.$inferSelect, "title" | "experienceLevel">
  question?: string | null
  notes?: string | null
}) {
  const messages = await fetchChatMessages(humeChatId)
  const formattedMessages = formatTranscript(messages)

  const { object } = await streamObject({
    model: google("gemini-flash-lite-latest"),
    schema: roundScoreSchema,
    prompt: JSON.stringify({
      transcript: formattedMessages,
      candidateWrittenNotes: notes || "(none provided)",
    }),
    system: `You are an expert technical interviewer evaluating a candidate's performance in one round of a multi-round hiring pipeline simulation.

Round type: ${roundType}
Job title: ${jobInfo.title}
Experience level: ${jobInfo.experienceLevel}

What this round was instructed to cover:
${roundInstructions}

${
  question
    ? `The specific question the candidate was asked in this round:\n${question}\n\nWhen scoring, evaluate the candidate specifically against this question - including whether they correctly identified the truly optimal solution and its time/space complexity, not just whether they found "a" working solution.`
    : ""
}

---

Input JSON has two fields: "transcript" (an array of { speaker: "interviewee" | "interviewer", text: string }), and "candidateWrittenNotes" (any pseudocode, code, or written notes the candidate typed during the round, if this was a DSA or technical round with a written component - may be empty if not applicable).

---

Review the full transcript and any written notes, and score the candidate's performance in this round out of 100, the way a real interviewer at this stage of a hiring process would evaluate a candidate - considering correctness, depth, communication clarity, and how well they handled follow-up questions. If written notes are provided, factor in the correctness and clarity of the actual code/pseudocode they wrote, not just what they said aloud. Be a fair but genuinely discerning evaluator, the way a real interviewer deciding whether to advance a candidate would be - do not default to a high score out of politeness.`,
  })

  const result = await object
  return result.score
}

export async function generateFinalPipelineReport({
  userName,
  jobInfo,
  rounds,
}: {
  userName: string
  jobInfo: Pick<typeof JobInfoTable.$inferSelect, "title" | "description" | "experienceLevel">
  rounds: {
    roundType: string
    order: number
    score: number | null
    passed: boolean | null
    humeChatId: string | null
    notes: string | null
    question: string | null
  }[]
}) {
  const roundTranscripts = await Promise.all(
    rounds.map(async round => {
      if (round.humeChatId == null) {
        return { ...round, transcript: [] }
      }
      const messages = await fetchChatMessages(round.humeChatId)
      return { ...round, transcript: formatTranscript(messages) }
    })
  )

  const { text } = await generateText({
    model: google("gemini-flash-lite-latest"),
    prompt: JSON.stringify(
      roundTranscripts.map(r => ({
        roundType: r.roundType,
        order: r.order,
        score: r.score,
        passed: r.passed,
        transcript: r.transcript,
        writtenNotes: r.notes || "(none provided)",
        questionAsked: r.question || "(not applicable for this round type)",
      }))
    ),
    maxSteps: 10,
    experimental_continueSteps: true,
    system: `You are an expert interview coach reviewing a candidate's full run through a multi-round mock hiring pipeline. Your output should be in markdown format.

---

Candidate's name: ${userName}
Job title: ${jobInfo.title}
Job description: ${jobInfo.description}
Experience level: ${jobInfo.experienceLevel}

---

Input format: a JSON array of rounds the candidate attempted, in order, each with a roundType, their score out of 100, whether they passed, the full transcript of that round in { speaker, text } format, and any writtenNotes (pseudocode/code the candidate typed during the round, if applicable).

---

Your task:

Write a holistic, insightful report covering the candidate's performance across every round they attempted, whether they made it through the entire pipeline or were stopped partway through. Organize your response into:

1. **Overall Summary** - a brief narrative of how the attempt went overall, referencing how far they got in the pipeline.
2. **What Went Well** - specific strengths observed across the rounds, grounded in concrete moments from the transcripts, not generic praise.
3. **What Could Be Improved** - specific weaknesses or missed opportunities, grounded in concrete moments from the transcripts.
4. **Round-by-Round Breakdown** - a short paragraph per round covering its score and key takeaways.
5. **Recommended Next Steps** - concrete, actionable advice for what to focus on before their next attempt or real interview.

Be honest and specific rather than generic - reference actual things the candidate said or did. Keep the tone constructive and encouraging, but do not inflate the assessment.`,
  })

  return text
}