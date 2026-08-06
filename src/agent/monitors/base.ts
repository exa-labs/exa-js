/**
 * Base client for the Exa Agent Monitors API.
 */

import { Exa } from "../../index";
import { headersForBetas } from "../betas";
import {
  AGENT_MONITORS_BETA_HEADER,
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
    betas: string[],
    method: string = "POST",
    data?: RequestBody,
    params?: QueryParams,
    headers?: Record<string, string>
  ): Promise<T> {
    if (!betas?.includes(AGENT_MONITORS_BETA_HEADER)) {
      throw new Error(
        `betas must include the Agent Monitors beta identifier ("${AGENT_MONITORS_BETA_HEADER}")`
      );
    }

    return this.client.request<T>(
      `/agent/monitors${endpoint}`,
      method,
      data,
      params,
      {
        ...headersForBetas(betas),
        ...headers,
      }
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
