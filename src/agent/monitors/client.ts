/**
 * Client for the Exa Agent Monitors API (`/agent/monitors`).
 */

import { Exa } from "../../index";
import { AgentMonitorsBaseClient } from "./base";
import {
  AddAgentMonitorEntitiesParams,
  AgentMonitor,
  AgentMonitorChange,
  AgentMonitorEntityView,
  AgentMonitorSnapshot,
  AgentMonitorSnapshotWaitOptions,
  AgentMonitorsBetaOptions,
  CreateAgentMonitorOptions,
  CreateAgentMonitorParams,
  CreateAgentMonitorSnapshotParams,
  DeletedAgentMonitor,
  ListAgentMonitorChangesParams,
  ListAgentMonitorChangesResponse,
  ListAgentMonitorEntitiesParams,
  ListAgentMonitorEntitiesResponse,
  ListAgentMonitorsParams,
  ListAgentMonitorsResponse,
} from "./types";

const DEFAULT_SNAPSHOT_POLL_INTERVAL_MS = 2000;
const DEFAULT_SNAPSHOT_POLL_TIMEOUT_MS = 60 * 60 * 1000;

type AgentMonitorTerminalSnapshot = AgentMonitorSnapshot & {
  status: "completed" | "failed";
};
type AgentMonitorCompletedSnapshot = AgentMonitorSnapshot & {
  status: "completed";
};

export class AgentMonitorSnapshotFailedError extends Error {
  snapshot: AgentMonitorSnapshot & { status: "failed" };

  constructor(snapshot: AgentMonitorSnapshot & { status: "failed" }) {
    super(snapshot.error ?? `Agent monitor snapshot ${snapshot.id} failed`);
    this.name = "AgentMonitorSnapshotFailedError";
    this.snapshot = snapshot;
  }
}

export class AgentMonitorEntitiesClient extends AgentMonitorsBaseClient {
  /**
   * Add entities to an existing Agent Monitor. Added entities are resolved
   * and backfilled shortly after the request completes, then update on the
   * monitor's regular refresh cadence.
   */
  async add(
    monitorId: string,
    params: AddAgentMonitorEntitiesParams & AgentMonitorsBetaOptions
  ): Promise<AgentMonitor> {
    const { betas, ...payload } = params;
    return this.request<AgentMonitor>(
      `/${monitorId}/entities`,
      betas,
      "POST",
      payload
    );
  }

  /**
   * Page an Agent Monitor's current entities and contents, optionally
   * filtered by update time.
   */
  async list(
    monitorId: string,
    options: ListAgentMonitorEntitiesParams & AgentMonitorsBetaOptions
  ): Promise<ListAgentMonitorEntitiesResponse> {
    const { betas, ...pagination } = options;
    const params = this.buildPaginationParams(pagination);
    return this.request<ListAgentMonitorEntitiesResponse>(
      `/${monitorId}/entities`,
      betas,
      "GET",
      undefined,
      params
    );
  }

  /**
   * Iterate through all of a monitor's entities, handling pagination
   * automatically.
   */
  async *listAll(
    monitorId: string,
    options: ListAgentMonitorEntitiesParams & AgentMonitorsBetaOptions
  ): AsyncGenerator<AgentMonitorEntityView> {
    let cursor: string | undefined = undefined;
    const { betas, ...pagination } = options;
    const pageOptions: ListAgentMonitorEntitiesParams = { ...pagination };

    while (true) {
      pageOptions.cursor = cursor;
      const response = await this.list(monitorId, { ...pageOptions, betas });

      for (const entityView of response.data) {
        yield entityView;
      }

      if (!response.hasMore || !response.nextCursor) {
        break;
      }

      cursor = response.nextCursor;
    }
  }

  /**
   * Collect all of a monitor's entities into an array.
   */
  async getAll(
    monitorId: string,
    options: ListAgentMonitorEntitiesParams & AgentMonitorsBetaOptions
  ): Promise<AgentMonitorEntityView[]> {
    const entities: AgentMonitorEntityView[] = [];
    for await (const entityView of this.listAll(monitorId, options)) {
      entities.push(entityView);
    }
    return entities;
  }
}

export class AgentMonitorChangesClient extends AgentMonitorsBaseClient {
  /**
   * Page an Agent Monitor's content change feed since a cursor or timestamp.
   */
  async list(
    monitorId: string,
    options: ListAgentMonitorChangesParams & AgentMonitorsBetaOptions
  ): Promise<ListAgentMonitorChangesResponse> {
    const { betas, ...pagination } = options;
    const params = this.buildPaginationParams(pagination);
    return this.request<ListAgentMonitorChangesResponse>(
      `/${monitorId}/changes`,
      betas,
      "GET",
      undefined,
      params
    );
  }

  /**
   * Iterate through a monitor's change feed, handling pagination
   * automatically.
   */
  async *listAll(
    monitorId: string,
    options: ListAgentMonitorChangesParams & AgentMonitorsBetaOptions
  ): AsyncGenerator<AgentMonitorChange> {
    let cursor: string | undefined = options?.cursor;
    const { betas, ...pagination } = options;
    const pageOptions: ListAgentMonitorChangesParams = { ...pagination };

    while (true) {
      pageOptions.cursor = cursor;
      const response = await this.list(monitorId, { ...pageOptions, betas });

      for (const change of response.data) {
        yield change;
      }

      if (!response.hasMore || !response.nextCursor) {
        break;
      }

      cursor = response.nextCursor;
    }
  }

  /**
   * Collect a monitor's change feed into an array.
   */
  async getAll(
    monitorId: string,
    options: ListAgentMonitorChangesParams & AgentMonitorsBetaOptions
  ): Promise<AgentMonitorChange[]> {
    const changes: AgentMonitorChange[] = [];
    for await (const change of this.listAll(monitorId, options)) {
      changes.push(change);
    }
    return changes;
  }
}

export class AgentMonitorSnapshotsClient extends AgentMonitorsBaseClient {
  /**
   * Start an async, stateless snapshot of entities × fields over an explicit
   * past news window — no monitor is created. Returns a `running` job; poll
   * with `get` (or use `createAndWait`) for the result.
   */
  async create(
    params: CreateAgentMonitorSnapshotParams & AgentMonitorsBetaOptions
  ): Promise<AgentMonitorSnapshot> {
    const { betas, ...payload } = params;
    return this.request<AgentMonitorSnapshot>(
      "/snapshot",
      betas,
      "POST",
      payload
    );
  }

  /**
   * Poll a snapshot job for its status and, once completed, its result.
   * Jobs expire and read as 404 after `expiresAt`.
   */
  async get(
    snapshotId: string,
    options: AgentMonitorsBetaOptions
  ): Promise<AgentMonitorSnapshot> {
    return this.request<AgentMonitorSnapshot>(
      `/snapshot/${snapshotId}`,
      options.betas,
      "GET"
    );
  }

  /**
   * Poll a snapshot job until it reaches a terminal status.
   */
  async pollUntilFinished(
    snapshotId: string,
    options: AgentMonitorSnapshotWaitOptions & AgentMonitorsBetaOptions
  ): Promise<AgentMonitorTerminalSnapshot> {
    const pollInterval =
      options?.pollInterval ?? DEFAULT_SNAPSHOT_POLL_INTERVAL_MS;
    const timeoutMs = options?.timeoutMs ?? DEFAULT_SNAPSHOT_POLL_TIMEOUT_MS;
    const startTime = Date.now();

    while (true) {
      const snapshot = await this.get(snapshotId, { betas: options.betas });
      if (snapshot.status !== "running") {
        return snapshot;
      }

      if (Date.now() - startTime > timeoutMs) {
        throw new Error(
          `Polling timeout: Agent monitor snapshot ${snapshotId} did not complete within ${timeoutMs}ms`
        );
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }
  }

  /**
   * Start a snapshot and wait for its result. Throws
   * AgentMonitorSnapshotFailedError if the snapshot fails.
   */
  async createAndWait(
    params: CreateAgentMonitorSnapshotParams & AgentMonitorsBetaOptions,
    options?: AgentMonitorSnapshotWaitOptions
  ): Promise<AgentMonitorCompletedSnapshot> {
    const snapshot = await this.create(params);
    const terminalSnapshot =
      snapshot.status === "running"
        ? await this.pollUntilFinished(snapshot.id, {
            ...options,
            betas: params.betas,
          })
        : snapshot;
    if (terminalSnapshot.status === "failed") {
      throw new AgentMonitorSnapshotFailedError(terminalSnapshot);
    }
    return terminalSnapshot as AgentMonitorCompletedSnapshot;
  }
}

export class AgentMonitorsClient extends AgentMonitorsBaseClient {
  /**
   * Client for a monitor's entities.
   */
  entities: AgentMonitorEntitiesClient;

  /**
   * Client for a monitor's content change feed.
   */
  changes: AgentMonitorChangesClient;

  /**
   * Client for stateless snapshot jobs.
   */
  snapshots: AgentMonitorSnapshotsClient;

  constructor(client: Exa) {
    super(client);
    this.entities = new AgentMonitorEntitiesClient(client);
    this.changes = new AgentMonitorChangesClient(client);
    this.snapshots = new AgentMonitorSnapshotsClient(client);
  }

  /**
   * Create an Agent Monitor from its entities, fields, and cadence.
   * Creation is async: the monitor is returned with status `creating` and
   * becomes `active` once its first refresh completes.
   */
  async create(
    params: CreateAgentMonitorParams & AgentMonitorsBetaOptions,
    options?: CreateAgentMonitorOptions
  ): Promise<AgentMonitor> {
    const { betas, ...payload } = params;
    const headers = options?.idempotencyKey
      ? { "Idempotency-Key": options.idempotencyKey }
      : undefined;
    return this.request<AgentMonitor>(
      "",
      betas,
      "POST",
      payload,
      undefined,
      headers
    );
  }

  /**
   * Get an Agent Monitor by ID, including refresh progress.
   */
  async get(
    monitorId: string,
    options: AgentMonitorsBetaOptions
  ): Promise<AgentMonitor> {
    return this.request<AgentMonitor>(`/${monitorId}`, options.betas, "GET");
  }

  /**
   * List the team's Agent Monitors.
   */
  async list(
    options: ListAgentMonitorsParams & AgentMonitorsBetaOptions
  ): Promise<ListAgentMonitorsResponse> {
    const { betas, ...pagination } = options;
    const params = this.buildPaginationParams(pagination);
    return this.request<ListAgentMonitorsResponse>(
      "",
      betas,
      "GET",
      undefined,
      params
    );
  }

  /**
   * Iterate through all Agent Monitors, handling pagination automatically.
   */
  async *listAll(
    options: ListAgentMonitorsParams & AgentMonitorsBetaOptions
  ): AsyncGenerator<AgentMonitor> {
    let cursor: string | undefined = undefined;
    const { betas, ...pagination } = options;
    const pageOptions: ListAgentMonitorsParams = { ...pagination };

    while (true) {
      pageOptions.cursor = cursor;
      const response = await this.list({ ...pageOptions, betas });

      for (const monitor of response.data) {
        yield monitor;
      }

      if (!response.hasMore || !response.nextCursor) {
        break;
      }

      cursor = response.nextCursor;
    }
  }

  /**
   * Collect all Agent Monitors into an array.
   */
  async getAll(
    options: ListAgentMonitorsParams & AgentMonitorsBetaOptions
  ): Promise<AgentMonitor[]> {
    const monitors: AgentMonitor[] = [];
    for await (const monitor of this.listAll(options)) {
      monitors.push(monitor);
    }
    return monitors;
  }

  /**
   * Delete an Agent Monitor and stop its refreshes.
   */
  async delete(
    monitorId: string,
    options: AgentMonitorsBetaOptions
  ): Promise<DeletedAgentMonitor> {
    return this.request<DeletedAgentMonitor>(
      `/${monitorId}`,
      options.betas,
      "DELETE"
    );
  }
}
