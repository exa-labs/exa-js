/**
 * Client for managing Webset Searches
 */
import { WebsetHeadersLike } from ".";
import { WebsetsBaseClient } from "./base";
import { CreateWebsetSearchParameters, WebsetSearch } from "./openapi";
import { type RequestOptions } from "../request-options";

/**
 * Client for managing Webset Searches
 */
export class WebsetSearchesClient extends WebsetsBaseClient {
  /**
   * Create a new Search for the Webset
   * @param websetId The ID of the Webset
   * @param params The search parameters
   * @param requestOptions Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`)
   * @returns The created Webset Search
   */
  async create(
    websetId: string,
    params: CreateWebsetSearchParameters,
    options?: { headers?: WebsetHeadersLike },
    requestOptions?: RequestOptions
  ): Promise<WebsetSearch> {
    const scoped = this.withRequestOptions(requestOptions);
    return scoped.request<WebsetSearch>(
      `/v0/websets/${websetId}/searches`,
      "POST",
      params,
      undefined,
      options?.headers
    );
  }

  /**
   * Get a Search by ID
   * @param websetId The ID of the Webset
   * @param id The ID of the Search
   * @param requestOptions Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`)
   * @returns The Webset Search
   */
  async get(
    websetId: string,
    id: string,
    requestOptions?: RequestOptions
  ): Promise<WebsetSearch> {
    const scoped = this.withRequestOptions(requestOptions);
    return scoped.request<WebsetSearch>(
      `/v0/websets/${websetId}/searches/${id}`,
      "GET"
    );
  }

  /**
   * Cancel a running Search
   * @param websetId The ID of the Webset
   * @param id The ID of the Search
   * @param requestOptions Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`)
   * @returns The canceled Webset Search
   */
  async cancel(
    websetId: string,
    id: string,
    requestOptions?: RequestOptions
  ): Promise<WebsetSearch> {
    const scoped = this.withRequestOptions(requestOptions);
    return scoped.request<WebsetSearch>(
      `/v0/websets/${websetId}/searches/${id}/cancel`,
      "POST"
    );
  }
}
