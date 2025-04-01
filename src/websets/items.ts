/**
 * Client for managing Webset Items
 */
import { WebsetsBaseClient } from "./base";
import { ListWebsetItemResponse, WebsetItem } from "./types";

/**
 * Client for managing Webset Items
 */
export class WebsetItemsClient extends WebsetsBaseClient {
  /**
   * List all Items for a Webset
   * @param websetId The ID of the Webset
   * @param cursor Optional cursor for pagination
   * @param limit Optional limit for pagination
   * @returns The list of Webset Items
   */
  async list(
    websetId: string,
    cursor?: string,
    limit?: number
  ): Promise<ListWebsetItemResponse> {
    const params: Record<string, any> = {};
    if (cursor) params.cursor = cursor;
    if (limit) params.limit = limit;

    return this.request(
      `/v0/websets/${websetId}/items`,
      "GET",
      undefined,
      params
    );
  }

  /**
   * Iterate through all Items in a Webset, handling pagination automatically
   * @param websetId The ID of the Webset
   * @param limit Optional limit for each page
   * @returns Async generator of Webset Items
   */
  async *listAll(
    websetId: string,
    limit?: number
  ): AsyncGenerator<WebsetItem> {
    let cursor: string | undefined = undefined;

    while (true) {
      const response = await this.list(websetId, cursor, limit);
      
      for (const item of response.data) {
        yield item;
      }

      if (!response.hasMore || !response.nextCursor) {
        break;
      }

      cursor = response.nextCursor;
    }
  }

  /**
   * Get an Item by ID
   * @param websetId The ID of the Webset
   * @param id The ID of the Item
   * @returns The Webset Item
   */
  async get(websetId: string, id: string): Promise<WebsetItem> {
    return this.request(`/v0/websets/${websetId}/items/${id}`, "GET");
  }

  /**
   * Delete an Item
   * @param websetId The ID of the Webset
   * @param id The ID of the Item
   * @returns The deleted Webset Item
   */
  async delete(websetId: string, id: string): Promise<WebsetItem> {
    return this.request(`/v0/websets/${websetId}/items/${id}`, "DELETE");
  }
}