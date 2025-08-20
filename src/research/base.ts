import { Exa } from "../index";
import { ListResearchRequest } from "./index";

type QueryParams = Record<
  string,
  string | number | boolean | string[] | undefined
>;

interface RequestBody {
  [key: string]: unknown;
}

export class ResearchBaseClient {
  protected client: Exa;

  constructor(client: Exa) {
    this.client = client;
  }

  protected async request<T = unknown>(
    endpoint: string,
    method: string = "POST",
    data?: RequestBody,
    params?: QueryParams
  ): Promise<T> {
    return this.client.request<T>(
      `/research/v1${endpoint}`,
      method,
      data,
      params
    );
  }

  protected async rawRequest(
    endpoint: string,
    method: string = "POST",
    data?: RequestBody,
    params?: QueryParams
  ): Promise<Response> {
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
