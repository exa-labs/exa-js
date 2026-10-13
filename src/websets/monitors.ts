/**
 * Client for managing Webset Monitors
 */
import { Exa } from "..";
import { PaginationParams, WebsetsBaseClient } from "./base";
import {
  CreateMonitorParameters,
  ListMonitorRunsResponse,
  ListMonitorsResponse,
  Monitor,
  MonitorRun,
  UpdateMonitor,
} from "./openapi";
import { type RequestOptions } from "../request-options";

/**
 * Options for listing monitors
 */
export interface ListMonitorsOptions extends PaginationParams {
  /**
   * The id of the Webset to list monitors for
   */
  websetId?: string;
}

/**
 * Client for managing Monitor Runs
 */
export class WebsetMonitorRunsClient extends WebsetsBaseClient {
  /**
   * List all runs for a Monitor
   * @param monitorId The ID of the Monitor
   * @param options Pagination options
   * @param requestOptions Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`)
   * @returns The list of Monitor runs
   */
  async list(
    monitorId: string,
    options?: PaginationParams,
    requestOptions?: RequestOptions
  ): Promise<ListMonitorRunsResponse> {
    const scoped = this.withRequestOptions(requestOptions);
    const params = this.buildPaginationParams(options);
    return scoped.request<ListMonitorRunsResponse>(
      `/v0/monitors/${monitorId}/runs`,
      "GET",
      undefined,
      params
    );
  }

  /**
   * Get a specific Monitor run
   * @param monitorId The ID of the Monitor
   * @param runId The ID of the Monitor run
   * @param requestOptions Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`)
   * @returns The Monitor run
   */
  async get(
    monitorId: string,
    runId: string,
    requestOptions?: RequestOptions
  ): Promise<MonitorRun> {
    const scoped = this.withRequestOptions(requestOptions);
    return scoped.request<MonitorRun>(
      `/v0/monitors/${monitorId}/runs/${runId}`,
      "GET"
    );
  }
}

/**
 * Client for managing Webset Monitors
 */
export class WebsetMonitorsClient extends WebsetsBaseClient {
  /**
   * Client for managing Monitor Runs
   */
  runs: WebsetMonitorRunsClient;

  constructor(client: Exa) {
    super(client);
    this.runs = new WebsetMonitorRunsClient(client);
  }

  /**
   * Create a Monitor
   * @param params The monitor parameters
   * @param requestOptions Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`)
   * @returns The created Monitor
   */
  async create(
    params: CreateMonitorParameters,
    requestOptions?: RequestOptions
  ): Promise<Monitor> {
    const scoped = this.withRequestOptions(requestOptions);
    return scoped.request<Monitor>("/v0/monitors", "POST", params);
  }

  /**
   * Get a Monitor by ID
   * @param id The ID of the Monitor
   * @param requestOptions Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`)
   * @returns The Monitor
   */
  async get(id: string, requestOptions?: RequestOptions): Promise<Monitor> {
    const scoped = this.withRequestOptions(requestOptions);
    return scoped.request<Monitor>(`/v0/monitors/${id}`, "GET");
  }

  /**
   * List all Monitors
   * @param options Pagination and filtering options
   * @param requestOptions Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`)
   * @returns The list of Monitors
   */
  async list(
    options?: ListMonitorsOptions,
    requestOptions?: RequestOptions
  ): Promise<ListMonitorsResponse> {
    const scoped = this.withRequestOptions(requestOptions);
    const params = {
      cursor: options?.cursor,
      limit: options?.limit,
      websetId: options?.websetId,
    };
    return scoped.request<ListMonitorsResponse>(
      "/v0/monitors",
      "GET",
      undefined,
      params
    );
  }

  /**
   * Update a Monitor
   * @param id The ID of the Monitor
   * @param params The monitor update parameters (status, metadata)
   * @param requestOptions Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`)
   * @returns The updated Monitor
   */
  async update(
    id: string,
    params: UpdateMonitor,
    requestOptions?: RequestOptions
  ): Promise<Monitor> {
    const scoped = this.withRequestOptions(requestOptions);
    return scoped.request<Monitor>(`/v0/monitors/${id}`, "PATCH", params);
  }

  /**
   * Delete a Monitor
   * @param id The ID of the Monitor
   * @param requestOptions Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`)
   * @returns The deleted Monitor
   */
  async delete(id: string, requestOptions?: RequestOptions): Promise<Monitor> {
    const scoped = this.withRequestOptions(requestOptions);
    return scoped.request<Monitor>(`/v0/monitors/${id}`, "DELETE");
  }

  /**
   * Iterate through all Monitors, handling pagination automatically
   * @param options Pagination and filtering options
   * @param requestOptions Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`)
   * @returns Async generator of Monitors
   */
  async *listAll(
    options?: ListMonitorsOptions,
    requestOptions?: RequestOptions
  ): AsyncGenerator<Monitor> {
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
   * Collect all Monitors into an array
   * @param options Pagination and filtering options
   * @param requestOptions Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`)
   * @returns Promise resolving to an array of all Monitors
   */
  async getAll(
    options?: ListMonitorsOptions,
    requestOptions?: RequestOptions
  ): Promise<Monitor[]> {
    const scoped = this.withRequestOptions(requestOptions);
    const monitors: Monitor[] = [];
    for await (const monitor of scoped.listAll(options)) {
      monitors.push(monitor);
    }
    return monitors;
  }
}
