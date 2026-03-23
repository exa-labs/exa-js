/**
 * Types for the Search Monitors API
 */

import type { ContentsOptions } from "../index";

// --- Enums / Literal types ---

export type SearchMonitorStatus = "active" | "paused" | "disabled";

export type SearchMonitorRunStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type SearchMonitorRunFailReason =
  | "api_key_invalid"
  | "insufficient_credits"
  | "invalid_params"
  | "rate_limited"
  | "search_unavailable"
  | "search_failed"
  | "internal_error";

export type SearchMonitorWebhookEvent =
  | "monitor.created"
  | "monitor.updated"
  | "monitor.deleted"
  | "monitor.run.created"
  | "monitor.run.completed";

// --- Nested types ---

export interface SearchMonitorSearch {
  query: string;
  numResults?: number;
  includeDomains?: string[];
  excludeDomains?: string[];
  contents?: ContentsOptions;
}

export interface SearchMonitorTrigger {
  type: "cron";
  expression: string;
  timezone?: string;
}

export interface SearchMonitorWebhook {
  url: string;
  events?: SearchMonitorWebhookEvent[];
}

export interface GroundingCitation {
  url: string;
  title: string;
}

export interface GroundingEntry {
  field: string;
  citations: GroundingCitation[];
  confidence: "low" | "medium" | "high";
}

export interface SearchMonitorRunOutput {
  results?: Record<string, unknown>[] | null;
  content?: string | null;
  grounding?: GroundingEntry[] | null;
}

// --- Main resource types ---

export interface SearchMonitor {
  id: string;
  name: string | null;
  status: SearchMonitorStatus;
  search: SearchMonitorSearch;
  trigger: SearchMonitorTrigger | null;
  outputSchema: Record<string, unknown> | null;
  metadata: Record<string, string> | null;
  webhook: SearchMonitorWebhook;
  nextRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSearchMonitorResponse extends SearchMonitor {
  webhookSecret: string;
}

export interface SearchMonitorRun {
  id: string;
  monitorId: string;
  status: SearchMonitorRunStatus;
  output: SearchMonitorRunOutput | null;
  failReason: SearchMonitorRunFailReason | null;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  cancelledAt: string | null;
  durationMs: number | null;
  createdAt: string;
  updatedAt: string;
}

// --- Request params ---

export interface CreateSearchMonitorParams {
  name?: string;
  search: SearchMonitorSearch;
  trigger?: SearchMonitorTrigger;
  outputSchema?: Record<string, unknown>;
  metadata?: Record<string, string>;
  webhook: SearchMonitorWebhook;
}

export interface UpdateSearchMonitorParams {
  name?: string | null;
  status?: SearchMonitorStatus;
  search?: SearchMonitorSearch;
  trigger?: SearchMonitorTrigger | null;
  outputSchema?: Record<string, unknown> | null;
  metadata?: Record<string, string> | null;
  webhook?: SearchMonitorWebhook;
}

export interface ListSearchMonitorsParams {
  cursor?: string;
  limit?: number;
  status?: SearchMonitorStatus;
}

export interface ListSearchMonitorRunsParams {
  cursor?: string;
  limit?: number;
}

// --- Response types ---

export interface ListSearchMonitorsResponse {
  data: SearchMonitor[];
  hasMore: boolean;
  nextCursor: string | null;
}

export interface ListSearchMonitorRunsResponse {
  data: SearchMonitorRun[];
  hasMore: boolean;
  nextCursor: string | null;
}

export interface TriggerSearchMonitorResponse {
  triggered: boolean;
}
