/**
 * Client for managing Webset Items
 */
import { PaginationParams, WebsetsBaseClient } from "./base";
import { ListWebsetItemResponse, QueryParams, WebsetItem } from "./types";

/**
 * Parameters for listing items
 */
export interface ListItemsParams extends PaginationParams {
  /**
   * Filter items by a specific search ID
   */
  searchId?: string;
  
  /**
   * Filter items by whether they satisfy all criteria
   */
  satisfiesCriteria?: boolean;
}

/**
 * Client for managing Webset Items
 */
export class WebsetItemsClient extends WebsetsBaseClient {
  /**
   * List all Items for a Webset
   * @param websetId The ID of the Webset
   * @param options Pagination and filtering options
   * @returns The list of Webset Items
   */
  async list(
    websetId: string,
    options?: ListItemsParams
  ): Promise<ListWebsetItemResponse> {
    const params = this.buildPaginationParams(options);
    
    // Add additional filtering parameters
    if (options?.searchId) params.searchId = options.searchId;
    if (options?.satisfiesCriteria !== undefined) {
      params.satisfiesCriteria = options.satisfiesCriteria;
    }

    return this.request<ListWebsetItemResponse>(
      `/v0/websets/${websetId}/items`,
      "GET",
      undefined,
      params
    );
  }

  /**
   * Iterate through all Items in a Webset, handling pagination automatically
   * @param websetId The ID of the Webset
   * @param options Pagination and filtering options
   * @returns Async generator of Webset Items
   */
  async *listAll(
    websetId: string,
    options?: ListItemsParams
  ): AsyncGenerator<WebsetItem> {
    let cursor: string | undefined = undefined;
    const pageSize = options?.limit;
    
    // Create a copy of options to avoid modifying the original
    const pageOptions = options ? { ...options } : {};

    while (true) {
      // Update cursor for each request
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
   * @param options Pagination and filtering options
   * @returns Promise resolving to an array of all Webset Items
   */
  async getAll(
    websetId: string,
    options?: ListItemsParams
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
    return this.request<WebsetItem>(`/v0/websets/${websetId}/items/${id}`, "GET");
  }

  /**
   * Delete an Item
   * @param websetId The ID of the Webset
   * @param id The ID of the Item
   * @returns The deleted Webset Item
   */
  async delete(websetId: string, id: string): Promise<WebsetItem> {
    return this.request<WebsetItem>(`/v0/websets/${websetId}/items/${id}`, "DELETE");
  }
}