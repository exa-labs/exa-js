/**
 * Client for managing Webset Items
 */
import { PaginationParams, WebsetsBaseClient } from "./base";
import { ListWebsetItemResponse, WebsetItem } from "./openapi";
import { type RequestOptions, collectAll } from "../request-options";

/**
 * Options for listing webset items
 */
export interface ListWebsetItemsOptions extends PaginationParams {
  /**
   * The id of the source to filter items by
   */
  sourceId?: string;
}

/**
 * Client for managing Webset Items
 */
export class WebsetItemsClient extends WebsetsBaseClient {
  /**
   * List all Items for a Webset
   * @param websetId The ID of the Webset
   * @param params - Optional pagination and filtering parameters
   * @param requestOptions Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`)
   * @returns A promise that resolves with the list of Items
   */
  list(
    websetId: string,
    params?: ListWebsetItemsOptions,
    requestOptions?: RequestOptions
  ): Promise<ListWebsetItemResponse> {
    const scoped = this.withRequestOptions(requestOptions);
    const queryParams = {
      ...this.buildPaginationParams(params),
      sourceId: params?.sourceId,
    };
    return scoped.request<ListWebsetItemResponse>(
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
   * @param requestOptions Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`)
   * @returns Async generator of Webset Items
   */
  async *listAll(
    websetId: string,
    options?: ListWebsetItemsOptions,
    requestOptions?: RequestOptions
  ): AsyncGenerator<WebsetItem> {
    yield* this.withRequestOptions(requestOptions).paginate(
      options?.cursor,
      (view, cursor) => view.list(websetId, { ...options, cursor })
    );
  }

  /**
   * Collect all items from a Webset into an array
   * @param websetId The ID of the Webset
   * @param options Pagination options
   * @param requestOptions Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`)
   * @returns Promise resolving to an array of all Webset Items
   */
  async getAll(
    websetId: string,
    options?: ListWebsetItemsOptions,
    requestOptions?: RequestOptions
  ): Promise<WebsetItem[]> {
    return collectAll(
      this.withRequestOptions(requestOptions).listAll(websetId, options)
    );
  }

  /**
   * Get an Item by ID
   * @param websetId The ID of the Webset
   * @param id The ID of the Item
   * @param requestOptions Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`)
   * @returns The Webset Item
   */
  async get(
    websetId: string,
    id: string,
    requestOptions?: RequestOptions
  ): Promise<WebsetItem> {
    const scoped = this.withRequestOptions(requestOptions);
    return scoped.request<WebsetItem>(
      `/v0/websets/${websetId}/items/${id}`,
      "GET"
    );
  }

  /**
   * Delete an Item
   * @param websetId The ID of the Webset
   * @param id The ID of the Item
   * @param requestOptions Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`)
   * @returns The deleted Webset Item
   */
  async delete(
    websetId: string,
    id: string,
    requestOptions?: RequestOptions
  ): Promise<WebsetItem> {
    const scoped = this.withRequestOptions(requestOptions);
    return scoped.request<WebsetItem>(
      `/v0/websets/${websetId}/items/${id}`,
      "DELETE"
    );
  }
}
