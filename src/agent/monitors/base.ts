/**
 * Base client for the Exa Agent Monitors API.
 */

import { Exa } from "../../index";
import {
  ListAgentMonitorChangesParams,
  ListAgentMonitorEntitiesParams,
  ListAgentMonitorsParams,
} from "./types";

type QueryParams = Record<
  string,
  string | number | boolean | string[] | undefined
>;

type RequestBody = Record<string, any>;

export class AgentMonitorsBaseClient {
  protected client: Exa;

  constructor(client: Exa) {
    this.client = client;
  }

  protected async request<T = unknown>(
    endpoint: string,
    method: string = "POST",
    data?: RequestBody,
    params?: QueryParams,
    headers?: Record<string, string>
  ): Promise<T> {
    return this.client.request<T>(
      `/agent/monitors${endpoint}`,
      method,
      data,
      params,
      headers
    );
  }

  protected buildPaginationParams(
    pagination?:
      | ListAgentMonitorsParams
      | ListAgentMonitorEntitiesParams
      | ListAgentMonitorChangesParams
  ): QueryParams {
    const params: QueryParams = {};
    if (!pagination) return params;

    if (pagination.cursor) params.cursor = pagination.cursor;
    if (pagination.limit) params.limit = pagination.limit;
    if ("since" in pagination && pagination.since)
      params.since = pagination.since;

    return params;
  }
}
