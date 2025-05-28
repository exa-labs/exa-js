import { Exa } from "../index";

type QueryParams = Record<
  string,
  string | number | boolean | string[] | undefined
>;

interface RequestBody {
  [key: string]: unknown;
}

/**
 * Base client class for all Research-related API clients
 */
export class ResearchBaseClient {
  protected client: Exa;

  /**
   * Initialize a new Research base client
   * @param client The Exa client instance
   */
  constructor(client: Exa) {
    this.client = client;
  }

  /**
   * Make a request to the Research API (prefixes all paths with `/research`).
   * @param endpoint The endpoint path, beginning with a slash (e.g. "/tasks").
   * @param method The HTTP method. Defaults to "POST".
   * @param data Optional request body
   * @param params Optional query parameters
   * @returns The parsed JSON response
   */
  protected async request<T = unknown>(
    endpoint: string,
    method: string = "POST",
    data?: RequestBody,
    params?: QueryParams
  ): Promise<T> {
    // Delegate to the root Exa client. Internally this handles error mapping and
    // query-string construction.
    return this.client.request<T>(
      `/v0/research${endpoint}`,
      method,
      data,
      params
    );
  }
}
