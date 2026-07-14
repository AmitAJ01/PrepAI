import { boolean, integer, pgEnum, pgTable, uuid, varchar } from "drizzle-orm/pg-core"
import { createdAt, id, updatedAt } from "../schemaHelpers"
import { relations } from "drizzle-orm/relations"
import { JobInfoTable } from "./jobInfo"
import { UserTable } from "./user"
import { InterviewTable } from "./interview"

export const pipelineRoundTypes = [
  "dsa_screen",
  "technical",
  "system_design",
  "behavioral",
] as const
export type PipelineRoundType = (typeof pipelineRoundTypes)[number]
export const pipelineRoundTypeEnum = pgEnum(
  "pipeline_round_type",
  pipelineRoundTypes
)

export const pipelineAttemptStatuses = [
  "in_progress",
  "passed",
  "rejected",
] as const
export type PipelineAttemptStatus = (typeof pipelineAttemptStatuses)[number]
export const pipelineAttemptStatusEnum = pgEnum(
  "pipeline_attempt_status",
  pipelineAttemptStatuses
)

export const HiringPipelineTable = pgTable("hiring_pipelines", {
  id,
  name: varchar().notNull(),
  exampleCompanies: varchar().notNull(),
  createdAt,
  updatedAt,
})

export const PipelineRoundTable = pgTable("pipeline_rounds", {
  id,
  pipelineId: uuid()
    .references(() => HiringPipelineTable.id, { onDelete: "cascade" })
    .notNull(),
  order: integer().notNull(),
  roundType: pipelineRoundTypeEnum().notNull(),
  passThreshold: integer().notNull(),
  systemPromptAddition: varchar().notNull(),
  createdAt,
  updatedAt,
})

export const PipelineAttemptTable = pgTable("pipeline_attempts", {
  id,
  userId: varchar()
    .references(() => UserTable.id, { onDelete: "cascade" })
    .notNull(),
  pipelineId: uuid()
    .references(() => HiringPipelineTable.id, { onDelete: "cascade" })
    .notNull(),
  jobInfoId: uuid()
    .references(() => JobInfoTable.id, { onDelete: "cascade" })
    .notNull(),
  currentRoundOrder: integer().notNull().default(1),
  status: pipelineAttemptStatusEnum().notNull().default("in_progress"),
  resumeSummary: varchar().notNull(),
  finalReport: varchar(),
  createdAt,
  updatedAt,
})

export const RoundAttemptTable = pgTable("round_attempts", {
  id,
  pipelineAttemptId: uuid()
    .references(() => PipelineAttemptTable.id, { onDelete: "cascade" })
    .notNull(),
  pipelineRoundId: uuid()
    .references(() => PipelineRoundTable.id, { onDelete: "cascade" })
    .notNull(),
  interviewId: uuid().references(() => InterviewTable.id, {
    onDelete: "set null",
  }),
  score: integer(),
  passed: boolean(),
  question: varchar(),
  notes: varchar(),
  createdAt,
  updatedAt,
})

export const hiringPipelineRelations = relations(
  HiringPipelineTable,
  ({ many }) => ({
    rounds: many(PipelineRoundTable),
    attempts: many(PipelineAttemptTable),
  })
)

export const pipelineRoundRelations = relations(
  PipelineRoundTable,
  ({ one, many }) => ({
    pipeline: one(HiringPipelineTable, {
      fields: [PipelineRoundTable.pipelineId],
      references: [HiringPipelineTable.id],
    }),
    roundAttempts: many(RoundAttemptTable),
  })
)

export const pipelineAttemptRelations = relations(
  PipelineAttemptTable,
  ({ one, many }) => ({
    user: one(UserTable, {
      fields: [PipelineAttemptTable.userId],
      references: [UserTable.id],
    }),
    pipeline: one(HiringPipelineTable, {
      fields: [PipelineAttemptTable.pipelineId],
      references: [HiringPipelineTable.id],
    }),
    jobInfo: one(JobInfoTable, {
      fields: [PipelineAttemptTable.jobInfoId],
      references: [JobInfoTable.id],
    }),
    roundAttempts: many(RoundAttemptTable),
  })
)

export const roundAttemptRelations = relations(RoundAttemptTable, ({ one }) => ({
  pipelineAttempt: one(PipelineAttemptTable, {
    fields: [RoundAttemptTable.pipelineAttemptId],
    references: [PipelineAttemptTable.id],
  }),
  pipelineRound: one(PipelineRoundTable, {
    fields: [RoundAttemptTable.pipelineRoundId],
    references: [PipelineRoundTable.id],
  }),
  interview: one(InterviewTable, {
    fields: [RoundAttemptTable.interviewId],
    references: [InterviewTable.id],
  }),
}))