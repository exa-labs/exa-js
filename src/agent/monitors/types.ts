/**
 * Types for the Exa Agent Monitors API (`/agent/monitors`).
 *
 * An Agent Monitor keeps a table of entities × fields fresh: static fields
 * are answered once per entity over the live web, dynamic fields are tracked
 * from news on every refresh, on the monitor's cadence.
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

/**
 * A field the monitor keeps fresh for every entity. Fields are dynamic
 * (tracked from news on every refresh) unless declared `mode: "static"`
 * (answered once over the live web).
 */
export interface AgentMonitorField {
  id: string;
  name: string;
  description: string;
  /** @deprecated The static/dynamic knob is becoming internal-only. */
  mode: AgentMonitorFieldMode;
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
 * Entity/field references on a change item. `id` is the canonical, stable
 * join key; the name attributes are denormalized for display, resolved as of
 * read time, and absent when the entity/field no longer exists.
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

/** An entity to track. `domain` anchors entity resolution and must be unique per monitor. */
export interface CreateAgentMonitorEntityParams {
  name: string;
  /** Resolution anchor: entities resolve by first-party or domain-verified evidence. */
  domain: string;
  /** Extra disambiguation context for entity resolution of ambiguous names. */
  description?: string;
}

/** A field to keep fresh. Dynamic (the default) unless declared `mode: "static"`. */
export interface CreateAgentMonitorFieldParams {
  name: string;
  description: string;
  /**
   * The type of the field's cell values; defaults to `"string"`. Cell values
   * are normalized to the declared type best-effort on write, never rejected
   * — but declaring an unsupported type (e.g. `"object"`) is a 400.
   * `"static"`/`"dynamic"` are accepted as deprecated aliases of `mode`;
   * declaring both spellings is a 400.
   */
  type?: AgentMonitorFieldValueType | AgentMonitorFieldMode;
  /** @deprecated The static/dynamic knob is becoming internal-only. */
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
  /** Store head change token — "am I caught up?" display only, NOT the cursor. */
  version: number;
}

export interface ListAgentMonitorChangesResponse {
  object: "list";
  data: AgentMonitorChange[];
  hasMore: boolean;
  /** Opaque; resume the feed from the last served change. Null when data is empty. */
  nextCursor: string | null;
  /** Store head change token — "am I caught up?" display only, NOT the cursor. */
  version: number;
}

export interface DeletedAgentMonitor {
  id: string;
  object: "agent_monitor.deleted";
  deleted: true;
}

// --- Backtests ---

/**
 * Params for a one-shot backtest of entities × fields over an explicit past
 * news window. The backtest runs one monitor refresh over the requested
 * window, then tears down its temporary monitor.
 */
export interface CreateAgentMonitorBacktestParams {
  entities: CreateAgentMonitorEntityParams[];
  fields: CreateAgentMonitorFieldParams[];
  /** Start of the news window as an ISO-8601 UTC timestamp. */
  startTime: string;
  /** End of the news window as an ISO-8601 UTC timestamp. */
  endTime: string;
}

/** One backtest cell: a value and its grounding citations. */
export interface AgentMonitorBacktestContent {
  value: unknown;
  citations: AgentMonitorCitation[];
}

/** One entity's backtest result, with populated cells keyed by field name. */
export interface AgentMonitorBacktestEntity {
  name: string;
  /** Populated cells by field name; fields with no update are absent. */
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
 * A backtest job: `create` returns it as `running`, and `get` polls it to
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
