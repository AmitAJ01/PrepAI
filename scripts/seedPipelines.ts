import { db } from "@/drizzle/db"
import { HiringPipelineTable, PipelineRoundTable } from "@/drizzle/schema"

async function seed() {
  // Template 1: Big tech, 4 rounds
  const bigTech = await db
    .insert(HiringPipelineTable)
    .values({
      name: "Big Tech Track",
      exampleCompanies: "Similar to processes at Google, Amazon, Meta, Microsoft",
    })
    .returning()
    .then(rows => rows[0])

  await db.insert(PipelineRoundTable).values([
    {
      pipelineId: bigTech.id,
      order: 1,
      roundType: "dsa_screen",
      passThreshold: 70,
      systemPromptAddition: `This is a DSA (Data Structures & Algorithms) screening round, similar to a real first-round technical screen at a large tech company.

A specific question has already been generated for this round and is shown below - present and discuss exactly this question, do not make up a different one:
{{dsaQuestion}}

Guide the candidate through the problem the way a real interviewer runs a DSA round:
1. Present the question above and confirm the candidate understands it, clarifying any ambiguity if they ask.
2. Ask them to start with a brute force approach - have them explain its logic and time/space complexity before moving on.
3. Then push them toward a better approach - ask questions like "can we do better than this?" if they don't offer one themselves.
4. Finally guide them to the optimal approach, discussing the final time/space complexity and any tradeoffs.

A text area is available for the candidate to write out code or pseudocode as they work through each approach - encourage them to use it while continuing to explain their reasoning verbally, the way a real interview with a shared doc or whiteboard would work. Ask natural follow-up questions the way a real interviewer would if the candidate's explanation is incomplete or unclear, and probe on edge cases. When forming your final assessment, weigh how well they progressed through brute force to optimal, not just whether they eventually arrived at a working solution.`,
    },
    {
      pipelineId: bigTech.id,
      order: 2,
      roundType: "technical",
      passThreshold: 70,
      systemPromptAddition: `This is a technical fundamentals round, similar to a real onsite technical interview at a large tech company.

Ask questions covering core computer science fundamentals relevant to the job description and experience level, drawing from areas such as: object-oriented programming principles, operating systems concepts (processes, threads, memory management, scheduling), computer networks (TCP/IP, DNS, HTTP), and database fundamentals (normalization, indexing, transactions, ACID properties).

Mix conceptual questions with practical "how would you apply this" scenarios. Weight your questions toward the specific technologies mentioned in the job description where relevant. Ask real follow-up questions based on the depth of the candidate's answers, the way an experienced interviewer would probe for genuine understanding versus memorized definitions.

Candidate's resume summary:
{{resumeSummary}}

Include at least one or two questions grounded in the candidate's own projects or work experience from their resume above — ask them to explain a specific technical decision, challenge, or tradeoff from a real project they've listed, the way a real interviewer would dig into your resume rather than asking only generic questions.`,
    },
    {
      pipelineId: bigTech.id,
      order: 3,
      roundType: "system_design",
      passThreshold: 65,
      systemPromptAddition: `This is a system design round, similar to a real system design interview at a large tech company.

Present an open-ended system design prompt scaled to the candidate's experience level:
- Junior/entry level: a simpler, well-scoped design problem (e.g., design a URL shortener)
- Mid-level: a moderately complex system with some ambiguity requiring clarifying questions
- Senior: a large-scale, ambiguous design problem requiring the candidate to define scope themselves

Probe on scalability, data modeling, tradeoffs between approaches, and how the candidate handles ambiguity. Ask them to justify their decisions rather than accepting the first answer.`,
    },
    {
      pipelineId: bigTech.id,
      order: 4,
      roundType: "behavioral",
      passThreshold: 60,
      systemPromptAddition: `This is a behavioral round, similar to a real behavioral interview at a large tech company.

Ask questions in the style of the STAR method (Situation, Task, Action, Result), covering topics like conflict resolution, working under pressure, leadership or ownership moments, and handling failure or mistakes. Ask natural follow-up questions probing for specifics ("what was the actual outcome," "what would you do differently") rather than accepting vague or generic answers.

Candidate's resume summary:
{{resumeSummary}}

Ground several of your questions in the candidate's actual work experience or internships listed above where possible, the way a real interviewer references your resume directly (e.g., "I see you worked on X at Y — tell me about a challenge you faced there") rather than asking only generic behavioral questions.`,
    },
  ])

  // Template 2: Mid-size product company, 3 rounds
  const midSize = await db
    .insert(HiringPipelineTable)
    .values({
      name: "Mid-size Product Company Track",
      exampleCompanies: "Similar to processes at Stripe, Airbnb, Notion",
    })
    .returning()
    .then(rows => rows[0])

  await db.insert(PipelineRoundTable).values([
    {
      pipelineId: midSize.id,
      order: 1,
      roundType: "technical",
      passThreshold: 70,
      systemPromptAddition: `This is a combined technical and problem-solving round, typical of a mid-size product company that folds algorithmic thinking into a broader technical conversation rather than a separate pure DSA screen.

Blend practical coding/algorithmic problem-solving (aim for at least one solid problem, two if time allows) with technical fundamentals (OOP, databases, API design). Scale problem difficulty to the candidate's experience level. Ask the candidate to reason out loud, and probe with follow-ups on their design and implementation choices.

Candidate's resume summary:
{{resumeSummary}}

Include at least one question grounded in the candidate's own projects or work experience from their resume above.`,
    },
    {
      pipelineId: midSize.id,
      order: 2,
      roundType: "system_design",
      passThreshold: 65,
      systemPromptAddition: `This is a system design round focused on practical, product-oriented system design rather than large-scale distributed systems.

Present a design problem grounded in a realistic product feature (e.g., designing a payments webhook system, a rate limiter, or an API for a specific product feature). Probe on data modeling, API design, and tradeoffs, scaled to the candidate's experience level.`,
    },
    {
      pipelineId: midSize.id,
      order: 3,
      roundType: "behavioral",
      passThreshold: 60,
      systemPromptAddition: `This is a behavioral round. Ask STAR-method style questions focused on collaboration, ownership, and how the candidate handles ambiguity or fast-changing priorities, typical of a fast-moving product company. Probe for specifics with natural follow-up questions.

Candidate's resume summary:
{{resumeSummary}}

Ground at least one or two questions in the candidate's actual work experience or internships listed above.`,
    },
  ])

  // Template 3: Startup/SaaS, 2 rounds
  const startup = await db
    .insert(HiringPipelineTable)
    .values({
      name: "Startup / SaaS Track",
      exampleCompanies: "Typical of early-stage startups and small SaaS companies",
    })
    .returning()
    .then(rows => rows[0])

  await db.insert(PipelineRoundTable).values([
    {
      pipelineId: startup.id,
      order: 1,
      roundType: "technical",
      passThreshold: 65,
      systemPromptAddition: `This is a practical technical round typical of an early-stage startup, prioritizing hands-on ability over deep theory.

Ask practical, full-stack-oriented questions relevant to the job description's tech stack. Favor "how would you build this" and "how would you debug this" style questions over abstract CS theory. Keep the pace brisk and pragmatic, the way a small team hiring quickly would.

Candidate's resume summary:
{{resumeSummary}}

Include at least one question grounded in the candidate's own projects or work experience from their resume above.`,
    },
    {
      pipelineId: startup.id,
      order: 2,
      roundType: "behavioral",
      passThreshold: 60,
      systemPromptAddition: `This is a culture-fit and behavioral round typical of an early-stage startup. Ask about comfort with ambiguity, working across the full stack, ownership mentality, and adaptability. Keep it conversational, probing with natural follow-ups.

Candidate's resume summary:
{{resumeSummary}}

Reference the candidate's actual work experience or internships listed above in at least one question.`,
    },
  ])

  console.log(
    "Seeded 3 pipeline templates: Big Tech Track, Mid-size Product Company Track, Startup / SaaS Track"
  )
  process.exit(0)
}

seed().catch(err => {
  console.error(err)
  process.exit(1)
})