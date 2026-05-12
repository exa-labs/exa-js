/**
 * Base client for the Exa Agent API.
 */

import { Exa } from "../index";
import { ListAgentRunEventsParams, ListAgentRunsParams } from "./types";

type QueryParams = Record<
  string,
  string | number | boolean | string[] | undefined
>;

type RequestBody = Record<string, unknown>;

export class AgentBaseClient {
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
    if (!betas?.length) {
      throw new Error("betas must include the Agent API beta identifier");
    }

    return this.client.request<T>(
      `/agent/runs${endpoint}`,
      method,
      data,
      params,
      {
        "Exa-Beta": betas.join(","),
        ...headers,
      }
    );
  }

  protected async rawRequest(
    endpoint: string,
    betas: string[],
    method: string = "POST",
    data?: RequestBody,
    params?: QueryParams,
    headers?: Record<string, string>
  ): Promise<Response> {
    if (!betas?.length) {
      throw new Error("betas must include the Agent API beta identifier");
    }

    return this.client.rawRequest(
      `/agent/runs${endpoint}`,
      method,
      data,
      params,
      {
        "Exa-Beta": betas.join(","),
        ...headers,
      }
    );
  }

  protected buildPaginationParams(
    pagination?: ListAgentRunsParams | ListAgentRunEventsParams
  ): QueryParams {
    const params: QueryParams = {};
    if (!pagination) return params;

    if (pagination.cursor) params.cursor = pagination.cursor;
    if (pagination.limit) params.limit = pagination.limit;

    return params;
  }
}
