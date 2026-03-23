/**
 * Client for the Search Monitors API
 */
import { Exa } from "..";
import { SearchMonitorsBaseClient } from "./base";
import {
  CreateSearchMonitorParams,
  CreateSearchMonitorResponse,
  ListSearchMonitorRunsParams,
  ListSearchMonitorRunsResponse,
  ListSearchMonitorsParams,
  ListSearchMonitorsResponse,
  SearchMonitor,
  SearchMonitorRun,
  TriggerSearchMonitorResponse,
  UpdateSearchMonitorParams,
} from "./types";

/**
 * Client for managing Search Monitor Runs
 */
export class SearchMonitorRunsClient extends SearchMonitorsBaseClient {
  /**
   * List all runs for a Search Monitor
   * @param monitorId The ID of the Search Monitor
   * @param options Pagination options
   * @returns The list of Search Monitor runs
   */
  async list(
    monitorId: string,
    options?: ListSearchMonitorRunsParams
  ): Promise<ListSearchMonitorRunsResponse> {
    const params = this.buildPaginationParams(options);
    return this.request<ListSearchMonitorRunsResponse>(
      `/${monitorId}/runs`,
      "GET",
      undefined,
      params
    );
  }

  /**
   * Get a specific Search Monitor run
   * @param monitorId The ID of the Search Monitor
   * @param runId The ID of the run
   * @returns The Search Monitor run
   */
  async get(monitorId: string, runId: string): Promise<SearchMonitorRun> {
    return this.request<SearchMonitorRun>(
      `/${monitorId}/runs/${runId}`,
      "GET"
    );
  }

  /**
   * Iterate through all runs for a Search Monitor, handling pagination automatically
   * @param monitorId The ID of the Search Monitor
   * @param options Pagination options
   * @returns Async generator of Search Monitor runs
   */
  async *listAll(
    monitorId: string,
    options?: ListSearchMonitorRunsParams
  ): AsyncGenerator<SearchMonitorRun> {
    let cursor: string | undefined = undefined;
    const pageOptions = options ? { ...options } : {};

    while (true) {
      pageOptions.cursor = cursor;
      const response = await this.list(monitorId, pageOptions);

      for (const run of response.data) {
        yield run;
      }

      if (!response.hasMore || !response.nextCursor) {
        break;
      }

      cursor = response.nextCursor;
    }
  }

  /**
   * Collect all runs for a Search Monitor into an array
   * @param monitorId The ID of the Search Monitor
   * @param options Pagination options
   * @returns Promise resolving to an array of all Search Monitor runs
   */
  async getAll(
    monitorId: string,
    options?: ListSearchMonitorRunsParams
  ): Promise<SearchMonitorRun[]> {
    const runs: SearchMonitorRun[] = [];
    for await (const run of this.listAll(monitorId, options)) {
      runs.push(run);
    }
    return runs;
  }
}

/**
 * Client for managing Search Monitors
 */
export class SearchMonitorsClient extends SearchMonitorsBaseClient {
  /**
   * Client for managing Search Monitor Runs
   */
  runs: SearchMonitorRunsClient;

  constructor(client: Exa) {
    super(client);
    this.runs = new SearchMonitorRunsClient(client);
  }

  /**
   * Create a Search Monitor
   * @param params The monitor creation parameters
   * @returns The created Search Monitor with webhookSecret
   */
  async create(
    params: CreateSearchMonitorParams
  ): Promise<CreateSearchMonitorResponse> {
    return this.request<CreateSearchMonitorResponse>("", "POST", params);
  }

  /**
   * Get a Search Monitor by ID
   * @param id The ID of the Search Monitor
   * @returns The Search Monitor
   */
  async get(id: string): Promise<SearchMonitor> {
    return this.request<SearchMonitor>(`/${id}`, "GET");
  }

  /**
   * List Search Monitors
   * @param options Pagination and filtering options
   * @returns The list of Search Monitors
   */
  async list(
    options?: ListSearchMonitorsParams
  ): Promise<ListSearchMonitorsResponse> {
    const params = this.buildPaginationParams(options);
    return this.request<ListSearchMonitorsResponse>(
      "",
      "GET",
      undefined,
      params
    );
  }

  /**
   * Update a Search Monitor
   * @param id The ID of the Search Monitor
   * @param params The update parameters
   * @returns The updated Search Monitor
   */
  async update(
    id: string,
    params: UpdateSearchMonitorParams
  ): Promise<SearchMonitor> {
    return this.request<SearchMonitor>(`/${id}`, "PATCH", params);
  }

  /**
   * Delete a Search Monitor
   * @param id The ID of the Search Monitor
   * @returns The deleted Search Monitor
   */
  async delete(id: string): Promise<SearchMonitor> {
    return this.request<SearchMonitor>(`/${id}`, "DELETE");
  }

  /**
   * Trigger a Search Monitor run immediately
   * @param id The ID of the Search Monitor
   * @returns Whether the monitor was triggered
   */
  async trigger(id: string): Promise<TriggerSearchMonitorResponse> {
    return this.request<TriggerSearchMonitorResponse>(
      `/${id}/trigger`,
      "POST"
    );
  }

  /**
   * Iterate through all Search Monitors, handling pagination automatically
   * @param options Pagination and filtering options
   * @returns Async generator of Search Monitors
   */
  async *listAll(
    options?: ListSearchMonitorsParams
  ): AsyncGenerator<SearchMonitor> {
    let cursor: string | undefined = undefined;
    const pageOptions = options ? { ...options } : {};

    while (true) {
      pageOptions.cursor = cursor;
      const response = await this.list(pageOptions);

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
   * Collect all Search Monitors into an array
   * @param options Pagination and filtering options
   * @returns Promise resolving to an array of all Search Monitors
   */
  async getAll(options?: ListSearchMonitorsParams): Promise<SearchMonitor[]> {
    const monitors: SearchMonitor[] = [];
    for await (const monitor of this.listAll(options)) {
      monitors.push(monitor);
    }
    return monitors;
  }
}
