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
import { type RequestOptions } from "../request-options";

/**
 * Client for managing Search Monitor Runs
 */
export class SearchMonitorRunsClient extends SearchMonitorsBaseClient {
  /**
   * List all runs for a Search Monitor
   * @param monitorId The ID of the Search Monitor
   * @param options Pagination options
   * @param requestOptions Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`)
   * @returns The list of Search Monitor runs
   */
  async list(
    monitorId: string,
    options?: ListSearchMonitorRunsParams,
    requestOptions?: RequestOptions
  ): Promise<ListSearchMonitorRunsResponse> {
    const scoped = this.withRequestOptions(requestOptions);
    const params = this.buildPaginationParams(options);
    return scoped.request<ListSearchMonitorRunsResponse>(
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
   * @param requestOptions Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`)
   * @returns The Search Monitor run
   */
  async get(
    monitorId: string,
    runId: string,
    requestOptions?: RequestOptions
  ): Promise<SearchMonitorRun> {
    const scoped = this.withRequestOptions(requestOptions);
    return scoped.request<SearchMonitorRun>(
      `/${monitorId}/runs/${runId}`,
      "GET"
    );
  }

  /**
   * Iterate through all runs for a Search Monitor, handling pagination automatically
   * @param monitorId The ID of the Search Monitor
   * @param options Pagination options
   * @param requestOptions Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`)
   * @returns Async generator of Search Monitor runs
   */
  async *listAll(
    monitorId: string,
    options?: ListSearchMonitorRunsParams,
    requestOptions?: RequestOptions
  ): AsyncGenerator<SearchMonitorRun> {
    let scoped = this.withRequestOptions(requestOptions);
    let cursor: string | undefined = undefined;
    const pageOptions = options ? { ...options } : {};

    while (true) {
      pageOptions.cursor = cursor;
      const response = await scoped.list(monitorId, pageOptions);

      for (const run of response.data) {
        yield run;
      }

      if (!response.hasMore || !response.nextCursor) {
        break;
      }

      cursor = response.nextCursor;
      scoped = scoped.forNextPage();
    }
  }

  /**
   * Collect all runs for a Search Monitor into an array
   * @param monitorId The ID of the Search Monitor
   * @param options Pagination options
   * @param requestOptions Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`)
   * @returns Promise resolving to an array of all Search Monitor runs
   */
  async getAll(
    monitorId: string,
    options?: ListSearchMonitorRunsParams,
    requestOptions?: RequestOptions
  ): Promise<SearchMonitorRun[]> {
    const scoped = this.withRequestOptions(requestOptions);
    const runs: SearchMonitorRun[] = [];
    for await (const run of scoped.listAll(monitorId, options)) {
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
   * @param requestOptions Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`)
   * @returns The created Search Monitor with webhookSecret
   */
  async create(
    params: CreateSearchMonitorParams,
    requestOptions?: RequestOptions
  ): Promise<CreateSearchMonitorResponse> {
    const scoped = this.withRequestOptions(requestOptions);
    return scoped.request<CreateSearchMonitorResponse>("", "POST", params);
  }

  /**
   * Get a Search Monitor by ID
   * @param id The ID of the Search Monitor
   * @param requestOptions Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`)
   * @returns The Search Monitor
   */
  async get(
    id: string,
    requestOptions?: RequestOptions
  ): Promise<SearchMonitor> {
    const scoped = this.withRequestOptions(requestOptions);
    return scoped.request<SearchMonitor>(`/${id}`, "GET");
  }

  /**
   * List Search Monitors
   * @param options Pagination and filtering options
   * @param requestOptions Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`)
   * @returns The list of Search Monitors
   */
  async list(
    options?: ListSearchMonitorsParams,
    requestOptions?: RequestOptions
  ): Promise<ListSearchMonitorsResponse> {
    const scoped = this.withRequestOptions(requestOptions);
    const params = this.buildPaginationParams(options);
    return scoped.request<ListSearchMonitorsResponse>(
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
   * @param requestOptions Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`)
   * @returns The updated Search Monitor
   */
  async update(
    id: string,
    params: UpdateSearchMonitorParams,
    requestOptions?: RequestOptions
  ): Promise<SearchMonitor> {
    const scoped = this.withRequestOptions(requestOptions);
    return scoped.request<SearchMonitor>(`/${id}`, "PATCH", params);
  }

  /**
   * Delete a Search Monitor
   * @param id The ID of the Search Monitor
   * @param requestOptions Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`)
   * @returns The deleted Search Monitor
   */
  async delete(
    id: string,
    requestOptions?: RequestOptions
  ): Promise<SearchMonitor> {
    const scoped = this.withRequestOptions(requestOptions);
    return scoped.request<SearchMonitor>(`/${id}`, "DELETE");
  }

  /**
   * Trigger a Search Monitor run immediately
   * @param id The ID of the Search Monitor
   * @param requestOptions Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`)
   * @returns Whether the monitor was triggered
   */
  async trigger(
    id: string,
    requestOptions?: RequestOptions
  ): Promise<TriggerSearchMonitorResponse> {
    const scoped = this.withRequestOptions(requestOptions);
    return scoped.request<TriggerSearchMonitorResponse>(
      `/${id}/trigger`,
      "POST"
    );
  }

  /**
   * Iterate through all Search Monitors, handling pagination automatically
   * @param options Pagination and filtering options
   * @param requestOptions Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`)
   * @returns Async generator of Search Monitors
   */
  async *listAll(
    options?: ListSearchMonitorsParams,
    requestOptions?: RequestOptions
  ): AsyncGenerator<SearchMonitor> {
    let scoped = this.withRequestOptions(requestOptions);
    let cursor: string | undefined = undefined;
    const pageOptions = options ? { ...options } : {};

    while (true) {
      pageOptions.cursor = cursor;
      const response = await scoped.list(pageOptions);

      for (const monitor of response.data) {
        yield monitor;
      }

      if (!response.hasMore || !response.nextCursor) {
        break;
      }

      cursor = response.nextCursor;
      scoped = scoped.forNextPage();
    }
  }

  /**
   * Collect all Search Monitors into an array
   * @param options Pagination and filtering options
   * @param requestOptions Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`)
   * @returns Promise resolving to an array of all Search Monitors
   */
  async getAll(
    options?: ListSearchMonitorsParams,
    requestOptions?: RequestOptions
  ): Promise<SearchMonitor[]> {
    const scoped = this.withRequestOptions(requestOptions);
    const monitors: SearchMonitor[] = [];
    for await (const monitor of scoped.listAll(options)) {
      monitors.push(monitor);
    }
    return monitors;
  }
}
