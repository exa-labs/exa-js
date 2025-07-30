/**
 * Base client for Websets API
 */
import { Exa } from "../index";

/**
 * Type for API query parameters
 */
type QueryParams = Record<
  string,
  string | number | boolean | string[] | undefined
>;

/**
 * Type for API request body
 */
interface RequestBody {
  [key: string]: unknown;
}

/**
 * Common pagination parameters
 */
export interface PaginationParams {
  /**
   * Cursor for pagination
   */
  cursor?: string;

  /**
   * Maximum number of items per page
   */
  limit?: number;
}

/**
 * Base client class for all Websets-related API clients
 */
export class WebsetsBaseClient {
  protected client: Exa;

  /**
   * Initialize a new Websets base client
   * @param client The Exa client instance
   */
  constructor(client: Exa) {
    this.client = client;
  }

  /**
   * Make a request to the Websets API
   * @param endpoint The endpoint path
   * @param method The HTTP method
   * @param data Optional request body data
   * @param params Optional query parameters
   * @returns The response JSON
   * @throws ExaError with API error details if the request fails
   */
  protected async request<T = unknown>(
    endpoint: string,
    method: string = "POST",
    data?: RequestBody,
    params?: QueryParams,
    headers?: Record<string, string>
  ): Promise<T> {
    return this.client.request<T>(
      `/websets${endpoint}`,
      method,
      data,
      params,
      headers
    );
  }

  /**
   * Helper to build pagination parameters
   * @param pagination The pagination parameters
   * @returns QueryParams object with pagination parameters
   */
  protected buildPaginationParams(pagination?: PaginationParams): QueryParams {
    const params: QueryParams = {};
    if (!pagination) return params;

    if (pagination.cursor) params.cursor = pagination.cursor;
    if (pagination.limit) params.limit = pagination.limit;

    return params;
  }
}
