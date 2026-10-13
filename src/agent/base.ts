/**
 * Base client for the Exa Agent API.
 */

import { Exa } from "../index";
import { RequestScopedClient, streamRequestOptions } from "../request-options";
import { ListAgentRunEventsParams, ListAgentRunsParams } from "./types";

type QueryParams = Record<
  string,
  string | number | boolean | string[] | undefined
>;

type RequestBody = Record<string, unknown>;

export class AgentBaseClient extends RequestScopedClient {
  protected client: Exa;

  constructor(client: Exa) {
    super();
    this.client = client;
  }

  protected async request<T = unknown>(
    endpoint: string,
    method: string = "POST",
    data?: RequestBody,
    params?: QueryParams,
    headers?: Record<string, string>
  ): Promise<T> {
    if (this.requestOptions) {
      return this.client.request<T>(
        `/agent/runs${endpoint}`,
        method,
        data,
        params,
        headers,
        this.requestOptions
      );
    }
    return this.client.request<T>(
      `/agent/runs${endpoint}`,
      method,
      data,
      params,
      headers
    );
  }

  /**
   * Opens a streamed response. `timeout` covers the wait for the stream to
   * start; the caller's `signal` can cancel it at any point.
   */
  protected async rawRequest(
    endpoint: string,
    method: string = "POST",
    data?: RequestBody,
    params?: QueryParams,
    headers?: Record<string, string>
  ): Promise<Response> {
    const transport = streamRequestOptions(this.client, this.requestOptions);
    if (transport) {
      return this.client.rawRequest(
        `/agent/runs${endpoint}`,
        method,
        data,
        params,
        headers,
        transport
      );
    }
    return this.client.rawRequest(
      `/agent/runs${endpoint}`,
      method,
      data,
      params,
      headers
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
