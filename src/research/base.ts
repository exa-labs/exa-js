import { Exa } from "../index";
import { RequestScopedClient, streamRequestOptions } from "../request-options";
import { ListResearchRequest } from "./index";

type QueryParams = Record<
  string,
  string | number | boolean | string[] | undefined
>;

interface RequestBody {
  [key: string]: unknown;
}

export class ResearchBaseClient extends RequestScopedClient {
  protected client: Exa;

  constructor(client: Exa) {
    super();
    this.client = client;
  }

  protected async request<T = unknown>(
    endpoint: string,
    method: string = "POST",
    data?: RequestBody,
    params?: QueryParams
  ): Promise<T> {
    if (this.requestOptions) {
      return this.client.request<T>(
        `/research/v1${endpoint}`,
        method,
        data,
        params,
        undefined,
        this.requestOptions
      );
    }
    return this.client.request<T>(
      `/research/v1${endpoint}`,
      method,
      data,
      params
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
    params?: QueryParams
  ): Promise<Response> {
    const transport = streamRequestOptions(this.client, this.requestOptions);
    if (transport) {
      return this.client.rawRequest(
        `/research/v1${endpoint}`,
        method,
        data,
        params,
        undefined,
        transport
      );
    }
    return this.client.rawRequest(
      `/research/v1${endpoint}`,
      method,
      data,
      params
    );
  }

  protected buildPaginationParams(
    pagination?: ListResearchRequest
  ): QueryParams {
    const params: QueryParams = {};
    if (!pagination) return params;

    if (pagination.cursor) params.cursor = pagination.cursor;
    if (pagination.limit) params.limit = pagination.limit;

    return params;
  }
}
