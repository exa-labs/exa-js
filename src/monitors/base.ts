/**
 * Base client for Search Monitors API
 */
import { Exa } from "../index";
import { RequestScopedClient } from "../request-options";
import { ListSearchMonitorsParams, ListSearchMonitorRunsParams } from "./types";

type QueryParams = Record<
  string,
  string | number | boolean | string[] | undefined
>;

export class SearchMonitorsBaseClient extends RequestScopedClient {
  protected client: Exa;

  constructor(client: Exa) {
    super();
    this.client = client;
  }

  protected async request<T = unknown>(
    endpoint: string,
    method: string = "POST",
    data?: Record<string, any>,
    params?: QueryParams
  ): Promise<T> {
    if (this.requestOptions) {
      return this.client.request<T>(
        `/monitors${endpoint}`,
        method,
        data,
        params,
        undefined,
        this.requestOptions
      );
    }
    return this.client.request<T>(`/monitors${endpoint}`, method, data, params);
  }

  protected buildPaginationParams(
    pagination?: ListSearchMonitorsParams | ListSearchMonitorRunsParams
  ): QueryParams {
    const params: QueryParams = {};
    if (!pagination) return params;

    if (pagination.cursor) params.cursor = pagination.cursor;
    if (pagination.limit) params.limit = pagination.limit;
    if ("status" in pagination && pagination.status)
      params.status = pagination.status;

    return params;
  }
}
