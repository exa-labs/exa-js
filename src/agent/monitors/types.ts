/**
 * Types for the Exa Agent Monitors API (`/agent/monitors`).
 *
 * An Agent Monitor keeps a table of entities × fields fresh on the monitor's
 * cadence.
 */

/** Beta identifier required for the Agent Monitors API. */
export const AGENT_MONITORS_BETA_HEADER = "agent-monitors-2026-08-04";

export interface AgentMonitorsBetaOptions {
  /** Beta feature identifiers to enable for this request. */
  betas: string[];
}

export type AgentMonitorStatus =
  | "creating"
  | "pending_first_refresh"
  | "active";

export type AgentMonitorFieldMode = "static" | "dynamic";

/** The type of a field's cell values. */
export type AgentMonitorFieldValueType =
  | "string"
  | "number"
  | "boolean"
  | "date"
  | "url"
  | "email"
  | "phone";

/** A field the monitor keeps fresh for every entity. */
export interface AgentMonitorField {
  id: string;
  name: string;
  description: string;
  /** @deprecated Not returned by the API. */
  mode?: AgentMonitorFieldMode;
  /** The type of the field's cell values. */
  type: AgentMonitorFieldValueType;
}

/** An entity tracked by the monitor. */
export interface AgentMonitorEntity {
  id: string;
  name: string;
  domain?: string;
  canonicalEntityId?: string;
}

/** One grounding citation for a cell value; the Agent API's citation shape. */
export interface AgentMonitorCitation {
  url: string;
  title?: string;
  note?: string;
}

/** One cell value: a field's current content for an entity. */
export interface AgentMonitorContent {
  value: unknown;
  /** Grounding for the value, in the Agent API's citation shape. */
  citations?: AgentMonitorCitation[];
  updatedAt: string;
}

/** Refresh progress on the monitor object; `idle` outside an active refresh. */
export type AgentMonitorRefresh =
  | { state: "idle" }
  | {
      state: "running";
      entitiesProcessed: number;
      entitiesTotal: number;
      startedAt: string;
    };

/** Creation progress on the monitor object; `idle` once the monitor is set up. */
export type AgentMonitorCreation =
  | { state: "idle" }
  | {
      state: "running";
      entitiesProcessed: number;
      entitiesTotal: number;
      startedAt: string;
    };

/** ACU consumption on the monitor object; ACUs are the unit Agent runs bill in. */
export interface AgentMonitorUsage {
  /** Lifetime ACUs consumed by the monitor's refreshes (creation's first refresh included). */
  totalAcus: number;
  /** ACUs consumed by the most recently completed refresh run. */
  lastRefreshAcus: number;
}

export interface AgentMonitor {
  id: string;
  object: "agent_monitor";
  status: AgentMonitorStatus;
  /** Refresh cadence, e.g. `"12h"` or `"7d"`; also each refresh's lookback window. */
  cadence: string;
  fields: AgentMonitorField[];
  entityCount: number;
  version: number;
  createdAt: string;
  lastRefreshAt: string | null;
  refresh: AgentMonitorRefresh;
  creation: AgentMonitorCreation;
  usage: AgentMonitorUsage;
  sourceRunId?: string;
}

/** One entity and its current contents, keyed by field id. */
export interface AgentMonitorEntityView {
  entity: AgentMonitorEntity;
  contents: Record<string, AgentMonitorContent>;
}

/**
 * Entity and field references on a change item. Join on `id`. The other
 * attributes show current values for display and are absent once the entity
 * or field is removed.
 */
export interface AgentMonitorChangeEntity {
  id: string;
  name?: string;
  domain?: string;
  canonicalEntityId?: string;
}

export interface AgentMonitorChangeField {
  id: string;
  name?: string;
}

/** One content change from the monitor's change feed. */
export interface AgentMonitorChange {
  type: "content.upserted";
  entity: AgentMonitorChangeEntity;
  field: AgentMonitorChangeField;
  content: AgentMonitorContent;
  version: number;
  /** ISO-8601 commit time of the change event. */
  createdAt: string;
}

// --- Request params ---

/** An entity to track. Each name and domain pair must be unique. */
export interface CreateAgentMonitorEntityParams {
  name: string;
  /** The entity's website domain, used to identify the entity. */
  domain: string;
  /** Extra disambiguation context for entity resolution of ambiguous names. */
  description?: string;
}

/** A field to keep fresh. */
export interface CreateAgentMonitorFieldParams {
  name: string;
  description: string;
  /**
   * The type of the field's values. Defaults to `"string"`. Values are
   * converted to this type where possible. An unsupported type fails the
   * request, including the deprecated values `"static"` and `"dynamic"`.
   */
  type?: AgentMonitorFieldValueType | AgentMonitorFieldMode;
  /** @deprecated Omit this field. The API rejects requests that set it. */
  mode?: AgentMonitorFieldMode;
}

export interface CreateAgentMonitorParams {
  /**
   * How often the monitor refreshes, e.g. `"12h"` or `"7d"` (minimum 6h).
   * Also each refresh's news lookback window.
   */
  cadence: string;
  entities: CreateAgentMonitorEntityParams[];
  fields: CreateAgentMonitorFieldParams[];
}

export interface CreateAgentMonitorOptions {
  /**
   * Sent as the `Idempotency-Key` header. A retried create with the same key
   * returns the monitor the first attempt created (resuming any unfinished
   * entity ingestion) instead of creating a duplicate. Reusing a key with a
   * different body is a 409.
   */
  idempotencyKey?: string;
}

export interface ListAgentMonitorsParams {
  cursor?: string;
  limit?: number;
}

export interface ListAgentMonitorEntitiesParams {
  cursor?: string;
  limit?: number;
  /** Only return entities whose contents were updated at or after this ISO-8601 timestamp. */
  since?: string;
}

export interface ListAgentMonitorChangesParams {
  cursor?: string;
  limit?: number;
  /** Only return changes committed at or after this ISO-8601 timestamp. */
  since?: string;
}

export interface AddAgentMonitorEntitiesParams {
  entities: CreateAgentMonitorEntityParams[];
}

// --- Responses ---

export interface ListAgentMonitorsResponse {
  object: "list";
  data: AgentMonitor[];
  hasMore: boolean;
  nextCursor: string | null;
}

export interface ListAgentMonitorEntitiesResponse {
  object: "list";
  data: AgentMonitorEntityView[];
  hasMore: boolean;
  nextCursor: string | null;
  /**
   * Latest change version of the monitor, for showing whether a reader is up
   * to date. Not a cursor. Page with `nextCursor`.
   */
  version: number;
}

export interface ListAgentMonitorChangesResponse {
  object: "list";
  data: AgentMonitorChange[];
  hasMore: boolean;
  /** Opaque; resume the feed from the last served change. Null when data is empty. */
  nextCursor: string | null;
  /**
   * Latest change version of the monitor, for showing whether a reader is up
   * to date. Not a cursor. Page with `nextCursor`.
   */
  version: number;
}

export interface DeletedAgentMonitor {
  id: string;
  object: "agent_monitor.deleted";
  deleted: true;
}

// --- Backtests ---

/**
 * Params for a backtest that fills fields for entities over a past window.
 * Fields answered from news use only news published between `startTime` and
 * `endTime`. Other fields return present values. No monitor is created.
 */
export interface CreateAgentMonitorBacktestParams {
  entities: CreateAgentMonitorEntityParams[];
  fields: CreateAgentMonitorFieldParams[];
  /** Start of the news window as an ISO-8601 UTC timestamp. */
  startTime: string;
  /** End of the news window as an ISO-8601 UTC timestamp. */
  endTime: string;
}

/** One backtest cell, with a value and its grounding citations. */
export interface AgentMonitorBacktestContent {
  value: unknown;
  citations: AgentMonitorCitation[];
}

/** One entity's backtest result, with populated cells keyed by field name. */
export interface AgentMonitorBacktestEntity {
  name: string;
  /** Populated cells by field name. Fields with no update are absent. */
  contents: Record<string, AgentMonitorBacktestContent>;
}

/** The computed body of a finished backtest, embedded in the job once it completes. */
export interface AgentMonitorBacktestResult {
  data: AgentMonitorBacktestEntity[];
  failedEntities?: Array<{ name: string; reason: string }>;
  /** Caveats about how the backtest was computed. */
  warnings?: string[];
}

export type AgentMonitorBacktestStatus = "running" | "completed" | "failed";

/**
 * A backtest job. `create` returns it as `running`, and `get` polls it to
 * `completed` (result fields present) or `failed`. Jobs expire and read as
 * 404 after `expiresAt`.
 */
export type AgentMonitorBacktest = {
  id: string;
  object: "agent_monitor.backtest";
  /** The backtested news window, echoed back as normalized ISO-8601 timestamps. */
  startTime: string;
  endTime: string;
  createdAt: string;
  expiresAt: string;
} & (
  | { status: "running" }
  | ({ status: "completed" } & AgentMonitorBacktestResult)
  | { status: "failed"; error: string }
);

export interface AgentMonitorBacktestWaitOptions {
  pollInterval?: number;
  timeoutMs?: number;
}
