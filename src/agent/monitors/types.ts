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

export type AgentMonitorFieldType = "static" | "dynamic";

/**
 * A field the monitor keeps fresh for every entity. Fields are static
 * (answered once over the live web) unless declared `type: "dynamic"`
 * (tracked from news on every refresh).
 */
export interface AgentMonitorField {
  id: string;
  name: string;
  description: string;
  type: AgentMonitorFieldType;
}

/** An entity tracked by the monitor. */
export interface AgentMonitorEntity {
  id: string;
  name: string;
  domain?: string;
  canonicalEntityId?: string;
}

/** One cell value: a field's current content for an entity. */
export interface AgentMonitorContent {
  value: unknown;
  sourceUrls?: string[];
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

/** A field to keep fresh. Static (the default) unless declared `type: "dynamic"`. */
export interface CreateAgentMonitorFieldParams {
  name: string;
  description: string;
  type?: AgentMonitorFieldType;
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

// --- Snapshots ---

/**
 * Params for a one-shot, stateless snapshot of entities × fields over an
 * explicit past news window — no monitor is created. The window bounds
 * dynamic fields only; static fields return present values answered over the
 * live web, and the result carries a warning when static fields are included.
 */
export interface CreateAgentMonitorSnapshotParams {
  entities: CreateAgentMonitorEntityParams[];
  fields: CreateAgentMonitorFieldParams[];
  /** Start of the news window to snapshot, `YYYY-MM-DD` (UTC). */
  startDate: string;
  /** Hour of startDate the window starts at, 0-23 UTC; omitted means midnight. */
  startHour?: number;
  /** End of the news window to snapshot, `YYYY-MM-DD` (UTC). */
  endDate: string;
  /** Hour of endDate the window ends at, 0-23 UTC; omitted means midnight. */
  endHour?: number;
}

/** One entity's snapshot result: populated field values plus the news sources read. */
export interface AgentMonitorSnapshotEntity {
  name: string;
  /** Populated values by field name; fields with no update are absent. */
  fields: Record<string, string>;
  sourceUrls: string[];
}

/** The computed body of a finished snapshot, embedded in the job once it completes. */
export interface AgentMonitorSnapshotResult {
  data: AgentMonitorSnapshotEntity[];
  failedEntities?: Array<{ name: string; reason: string }>;
  /** Caveats about how the snapshot was computed, e.g. static fields ignoring the window. */
  warnings?: string[];
}

export type AgentMonitorSnapshotStatus = "running" | "completed" | "failed";

/**
 * A snapshot job: `create` returns it as `running`, and `get` polls it to
 * `completed` (result fields present) or `failed`. Jobs expire and read as
 * 404 after `expiresAt`.
 */
export type AgentMonitorSnapshot = {
  id: string;
  object: "agent_monitor.snapshot";
  /** The snapshotted news window, echoed back as normalized ISO-8601 timestamps. */
  startTime: string;
  endTime: string;
  createdAt: string;
  expiresAt: string;
} & (
  | { status: "running" }
  | ({ status: "completed" } & AgentMonitorSnapshotResult)
  | { status: "failed"; error: string }
);

export interface AgentMonitorSnapshotWaitOptions {
  pollInterval?: number;
  timeoutMs?: number;
}
