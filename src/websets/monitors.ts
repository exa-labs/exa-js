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
   * @returns The list of Monitor runs
   */
  async list(
    monitorId: string,
    options?: PaginationParams
  ): Promise<ListMonitorRunsResponse> {
    const params = this.buildPaginationParams(options);
    return this.request<ListMonitorRunsResponse>(
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
   * @returns The Monitor run
   */
  async get(monitorId: string, runId: string): Promise<MonitorRun> {
    return this.request<MonitorRun>(
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
   * @returns The created Monitor
   */
  async create(params: CreateMonitorParameters): Promise<Monitor> {
    return this.request<Monitor>("/v0/monitors", "POST", params);
  }

  /**
   * Get a Monitor by ID
   * @param id The ID of the Monitor
   * @returns The Monitor
   */
  async get(id: string): Promise<Monitor> {
    return this.request<Monitor>(`/v0/monitors/${id}`, "GET");
  }

  /**
   * List all Monitors
   * @param options Pagination and filtering options
   * @returns The list of Monitors
   */
  async list(options?: ListMonitorsOptions): Promise<ListMonitorsResponse> {
    const params = {
      cursor: options?.cursor,
      limit: options?.limit,
      websetId: options?.websetId,
    };
    return this.request<ListMonitorsResponse>(
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
   * @returns The updated Monitor
   */
  async update(id: string, params: UpdateMonitor): Promise<Monitor> {
    return this.request<Monitor>(`/v0/monitors/${id}`, "PATCH", params);
  }

  /**
   * Delete a Monitor
   * @param id The ID of the Monitor
   * @returns The deleted Monitor
   */
  async delete(id: string): Promise<Monitor> {
    return this.request<Monitor>(`/v0/monitors/${id}`, "DELETE");
  }
}
