/**
 * Types for the Exa Agent API.
 */

import { ZodSchema } from "zod";

/**
 * @deprecated `exa.agent` does not need a beta header.
 */
export const AGENT_BETA_HEADER = "agent-2026-05-07";

export const AGENT_MAX_EFFORT_BETA = "agent-max-effort-2026-07-27";

export interface AgentBetaOptions {
  /**
   * @deprecated `exa.agent` does not need a beta header. Values supplied to
   * `exa.beta.agent` are sent as the `Exa-Beta` header.
   */
  betas?: string[];
}

export type AgentRunStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type AgentStopReason =
  | "schema_satisfied"
  | "budget_reached"
  | "time_limit_reached"
  | "stopped"
  | "error"
  | "cancelled";

export type AgentConfidence = "low" | "medium" | "high";

export type AgentEffort =
  | "minimal"
  | "low"
  | "medium"
  | "high"
  | "xhigh"
  | "auto"
  | "ultra"
  | "max";

/** Per-run spend ceiling for the metered `auto` and `ultra` efforts. */
export interface AgentBudget {
  /**
   * Maximum spend for the run in US dollars, from 1 to 100. Only for `auto`
   * and `ultra` effort. Defaults to 5 for `auto` and 20 for `ultra`.
   */
  maxCostDollars?: number;
  /**
   * Soft wall-clock ceiling in seconds (300–10,800). Only accepted for `ultra`.
   */
  maxDurationSeconds?: number;
}

/**
 * Identifier of an Exa Connect data provider. See the Exa Connect docs for the
 * full list.
 */
export type AgentDataSourceProvider = string;

/** Exa Connect data source to enable for an Agent run. */
export interface AgentDataSource {
  /** Exa Connect data provider to enable for the run. */
  provider: AgentDataSourceProvider;
}

export interface AgentInput {
  data?: Record<string, unknown>[];
  exclusion?: Record<string, unknown>[];
  [key: string]: unknown;
}

export interface AgentGroundingCitation {
  url: string;
  title?: string | null;
  [key: string]: unknown;
}

export interface AgentGroundingEntry {
  field: string;
  citations: AgentGroundingCitation[];
  score?: number | null;
  confidence?: AgentConfidence | null;
  [key: string]: unknown;
}

export interface AgentOutput {
  text?: string | null;
  structured?: unknown;
  grounding?: AgentGroundingEntry[] | null;
  [key: string]: unknown;
}

export interface AgentUsage {
  agentComputeUnits?: number;
  searches?: number;
  emails?: number;
  phoneNumbers?: number;
  /** Per-provider tool call counts for Exa Connect data sources used during the run. */
  dataSources?: Record<string, number>;
  [key: string]: unknown;
}

export interface AgentCostDollars {
  total?: number;
  agentCompute?: number;
  search?: number;
  emails?: number;
  phoneNumbers?: number;
  /** Per-provider cost in dollars for Exa Connect data sources used during the run. */
  dataSources?: Record<string, number>;
  [key: string]: unknown;
}

export interface AgentError {
  type?: string;
  code?: string;
  message?: string;
  path?: string;
  keyword?: string;
  expected?: unknown;
  actual?: unknown;
  [key: string]: unknown;
}

export interface AgentRun {
  id: string;
  object?: string;
  status: AgentRunStatus;
  stopReason?: AgentStopReason | null;
  createdAt?: string;
  completedAt?: string | null;
  request?: Record<string, unknown>;
  output?: AgentOutput | null;
  usage?: AgentUsage;
  costDollars?: AgentCostDollars;
  error?: AgentError;
  [key: string]: unknown;
}

export type AgentRunTyped<T> = AgentRun & {
  output?: (AgentOutput & { structured?: T }) | null;
};

export interface ListAgentRunsParams {
  cursor?: string;
  limit?: number;
}

export interface ListAgentRunsResponse {
  object?: string;
  data: AgentRun[];
  hasMore: boolean;
  nextCursor: string | null;
}

export interface DeletedAgentRun {
  id: string;
  object?: string;
  deleted: boolean;
}

export interface AgentEvent {
  id?: string;
  event: string;
  data: Record<string, unknown>;
  createdAt?: string;
  [key: string]: unknown;
}

export interface ListAgentRunEventsParams {
  cursor?: string;
  limit?: number;
}

export interface ListAgentRunEventsResponse {
  object?: string;
  data: AgentEvent[];
  hasMore: boolean;
  nextCursor: string | null;
}

export interface CreateAgentRunParams {
  query: string;
  systemPrompt?: string;
  input?: AgentInput;
  outputSchema?: Record<string, unknown>;
  effort?: AgentEffort;
  budget?: AgentBudget;
  previousRunId?: string;
  metadata?: Record<string, unknown>;
  /** Exa Connect data providers to enable for the run. Each entry enables all of that provider's tools. */
  dataSources?: AgentDataSource[];
  /**
   * An opaque ID you assign to the end user this run is made for, such as a
   * UUID, used to attribute usage to that end user. Must not contain personal
   * information such as an email address, phone number, username or name.
   * Hash such values before sending them. 1 to 64 characters: letters, digits,
   * `_` and `-`. Retained even when your team has Zero Data Retention
   * enabled. Does not affect results. A follow-up run (`previousRunId`) that
   * omits it inherits the identifier of the run it continues.
   */
  userIdentifier?: string;
}

export type CreateAgentRunParamsTyped<T> = Omit<
  CreateAgentRunParams,
  "outputSchema"
> & {
  outputSchema?: T;
};

export type AgentCreateOptions<T = Record<string, unknown>> =
  CreateAgentRunParamsTyped<Record<string, unknown> | ZodSchema<T>> & {
    stream?: boolean;
  };
