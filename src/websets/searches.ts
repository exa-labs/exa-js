/**
 * Client for managing Webset Searches
 */
import { WebsetsBaseClient } from "./base";
import { CreateWebsetSearchParameters, WebsetSearch } from "./openapi";

/**
 * Client for managing Webset Searches
 */
export class WebsetSearchesClient extends WebsetsBaseClient {
  /**
   * Create a new Search for the Webset
   * @param websetId The ID of the Webset
   * @param params The search parameters
   * @returns The created Webset Search
   */
  async create(
    websetId: string,
    params: CreateWebsetSearchParameters
  ): Promise<WebsetSearch> {
    return this.request<WebsetSearch>(
      `/v0/websets/${websetId}/searches`,
      "POST",
      params
    );
  }

  /**
   * Get a Search by ID
   * @param websetId The ID of the Webset
   * @param id The ID of the Search
   * @returns The Webset Search
   */
  async get(websetId: string, id: string): Promise<WebsetSearch> {
    return this.request<WebsetSearch>(
      `/v0/websets/${websetId}/searches/${id}`,
      "GET"
    );
  }

  /**
   * Cancel a running Search
   * @param websetId The ID of the Webset
   * @param id The ID of the Search
   * @returns The canceled Webset Search
   */
  async cancel(websetId: string, id: string): Promise<WebsetSearch> {
    return this.request<WebsetSearch>(
      `/v0/websets/${websetId}/searches/${id}/cancel`,
      "POST"
    );
  }
}
