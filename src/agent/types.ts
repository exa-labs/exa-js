/**
 * Types for the Exa Agent API.
 */

import { ZodSchema } from "zod";

/**
 * @deprecated Agent API beta header is no longer required for `exa.agent`.
 * Retained for legacy `exa.beta.agent` compatibility.
 */
export const AGENT_BETA_HEADER = "agent-2026-05-07";

export interface AgentBetaOptions {
  /**
   * @deprecated Agent API beta header is no longer required for `exa.agent`.
   * Values supplied to `exa.beta.agent` are sent as the `Exa-Beta` header.
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
  | "error"
  | "cancelled";

export type AgentConfidence = "low" | "medium" | "high";

export type AgentEffort = "low" | "medium" | "high" | "xhigh" | "auto";

/**
 * Identifier of an Exa Connect data provider, e.g. `"fiber_ai"`,
 * `"financial_datasets"`, `"similarweb"`, `"baselayer"`, `"affiliate"`,
 * `"particle_news"`, or `"jinko"`.
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
  previousRunId?: string;
  metadata?: Record<string, unknown>;
  /** Exa Connect data providers to enable for the run. Each entry enables all of that provider's tools. */
  dataSources?: AgentDataSource[];
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
