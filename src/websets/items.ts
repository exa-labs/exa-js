/**
 * Client for managing Webset Items
 */
import { PaginationParams, WebsetsBaseClient } from "./base";
import { ListWebsetItemResponse, WebsetItem } from "./openapi";

/**
 * Client for managing Webset Items
 */
export class WebsetItemsClient extends WebsetsBaseClient {
  /**
   * List all Items for a Webset
   * @param websetId The ID of the Webset
   * @param params - Optional pagination parameters
   * @returns A promise that resolves with the list of Items
   */
  list(
    websetId: string,
    params?: PaginationParams
  ): Promise<ListWebsetItemResponse> {
    const queryParams = this.buildPaginationParams(params);
    return this.request<ListWebsetItemResponse>(
      `/v0/websets/${websetId}/items`,
      "GET",
      undefined,
      queryParams
    );
  }

  /**
   * Iterate through all Items in a Webset, handling pagination automatically
   * @param websetId The ID of the Webset
   * @param options Pagination options
   * @returns Async generator of Webset Items
   */
  async *listAll(
    websetId: string,
    options?: PaginationParams
  ): AsyncGenerator<WebsetItem> {
    let cursor: string | undefined = undefined;
    const pageSize = options?.limit; // Keep for potential future use or clarity
    const pageOptions = options ? { ...options } : {};

    while (true) {
      pageOptions.cursor = cursor;
      const response = await this.list(websetId, pageOptions);

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
   * Collect all items from a Webset into an array
   * @param websetId The ID of the Webset
   * @param options Pagination options
   * @returns Promise resolving to an array of all Webset Items
   */
  async getAll(
    websetId: string,
    options?: PaginationParams
  ): Promise<WebsetItem[]> {
    const items: WebsetItem[] = [];
    for await (const item of this.listAll(websetId, options)) {
      items.push(item);
    }
    return items;
  }

  /**
   * Get an Item by ID
   * @param websetId The ID of the Webset
   * @param id The ID of the Item
   * @returns The Webset Item
   */
  async get(websetId: string, id: string): Promise<WebsetItem> {
    return this.request<WebsetItem>(
      `/v0/websets/${websetId}/items/${id}`,
      "GET"
    );
  }

  /**
   * Delete an Item
   * @param websetId The ID of the Webset
   * @param id The ID of the Item
   * @returns The deleted Webset Item
   */
  async delete(websetId: string, id: string): Promise<WebsetItem> {
    return this.request<WebsetItem>(
      `/v0/websets/${websetId}/items/${id}`,
      "DELETE"
    );
  }
}
