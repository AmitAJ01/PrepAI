import { generateText } from "ai"
import { google } from "../models/google"

export async function extractResumeSummary(resumeFile: File) {
  const { text } = await generateText({
    model: google("gemini-flash-lite-latest"),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "file",
            data: await resumeFile.arrayBuffer(),
            mimeType: resumeFile.type,
          },
        ],
      },
    ],
    system: `You are extracting a structured summary from a candidate's resume for use as interview context.

Read the resume file provided and produce a concise plain-text summary covering:

1. **Projects** - key projects listed, including the tech stack used and what the project did
2. **Work experience / internships** - each role, company, duration, and key responsibilities or achievements
3. **Core skills** - programming languages, frameworks, and tools listed

Keep the summary factual and concise (aim for under 400 words). Use plain text with simple headers, no markdown formatting beyond basic line breaks. This summary will be used to help an AI interviewer ask relevant, specific questions about the candidate's actual background, so preserve concrete details (technology names, project names, company names, specific achievements) rather than vague generalizations.

Only return the summary text. Do not include any preamble, explanation, or commentary.`,
  })

  return text
}