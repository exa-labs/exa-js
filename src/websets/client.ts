/**
 * Main client for Websets API
 */
import { Exa } from "../index";
import { WebsetsBaseClient } from "./base";
import { WebsetItemsClient } from "./items";
import { WebsetSearchesClient } from "./searches";
import { WebsetEnrichmentsClient } from "./enrichments";
import { WebsetWebhooksClient } from "./webhooks";
import {
  CreateWebsetParameters,
  GetWebsetResponse,
  ListWebsetsResponse,
  QueryParams,
  UpdateWebsetRequest,
  Webset,
  WebsetStatus,
} from "./types";

/**
 * Client for managing Websets
 */
export class WebsetsClient extends WebsetsBaseClient {
  /**
   * Client for managing Webset Items
   */
  items: WebsetItemsClient;

  /**
   * Client for managing Webset Searches
   */
  searches: WebsetSearchesClient;

  /**
   * Client for managing Webset Enrichments
   */
  enrichments: WebsetEnrichmentsClient;

  /**
   * Client for managing Webset Webhooks
   */
  webhooks: WebsetWebhooksClient;

  /**
   * Initialize a new Websets client
   * @param client The Exa client instance
   */
  constructor(client: Exa) {
    super(client);
    this.items = new WebsetItemsClient(client);
    this.searches = new WebsetSearchesClient(client);
    this.enrichments = new WebsetEnrichmentsClient(client);
    this.webhooks = new WebsetWebhooksClient(client);
  }

  /**
   * Create a new Webset
   * @param params The Webset creation parameters
   * @returns The created Webset
   */
  async create(params: CreateWebsetParameters): Promise<Webset> {
    return this.request<Webset>("/v0/websets", "POST", params);
  }

  /**
   * Get a Webset by ID
   * @param id The ID of the Webset
   * @param expand Optional array of relations to expand
   * @returns The Webset
   */
  async get(
    id: string,
    expand?: Array<"items">
  ): Promise<GetWebsetResponse> {
    const params: QueryParams = {};
    if (expand && expand.length > 0) {
      params.expand = expand;
    }

    return this.request<GetWebsetResponse>(`/v0/websets/${id}`, "GET", undefined, params);
  }

  /**
   * List all Websets
   * @param options Pagination and filtering options
   * @returns The list of Websets
   */
  async list(options?: PaginationParams & {
    /**
     * Filter Websets by their status
     */
    status?: WebsetStatus;
    
    /**
     * Filter Websets by external ID
     */
    externalId?: string;
  }): Promise<ListWebsetsResponse> {
    const params = this.buildPaginationParams(options);
    
    // Add additional filtering parameters
    if (options?.status) params.status = options.status;
    if (options?.externalId) params.externalId = options.externalId;

    return this.request<ListWebsetsResponse>("/v0/websets", "GET", undefined, params);
  }
  
  /**
   * Iterate through all Websets, handling pagination automatically
   * @param options Pagination and filtering options
   * @returns Async generator of Websets
   */
  async *listAll(options?: Parameters<WebsetsClient['list']>[0]): AsyncGenerator<Webset> {
    let cursor: string | undefined = undefined;
    const pageOptions = options ? { ...options } : {};
    
    while (true) {
      pageOptions.cursor = cursor;
      const response = await this.list(pageOptions);
      
      for (const webset of response.data) {
        yield webset;
      }
      
      if (!response.hasMore || !response.nextCursor) {
        break;
      }
      
      cursor = response.nextCursor;
    }
  }
  
  /**
   * Collect all Websets into an array
   * @param options Pagination and filtering options
   * @returns Promise resolving to an array of all Websets
   */
  async getAll(options?: Parameters<WebsetsClient['list']>[0]): Promise<Webset[]> {
    const websets: Webset[] = [];
    for await (const webset of this.listAll(options)) {
      websets.push(webset);
    }
    return websets;
  }

  /**
   * Update a Webset
   * @param id The ID of the Webset
   * @param params The Webset update parameters
   * @returns The updated Webset
   */
  async update(id: string, params: UpdateWebsetRequest): Promise<Webset> {
    return this.request<Webset>(`/v0/websets/${id}`, "POST", params);
  }

  /**
   * Delete a Webset
   * @param id The ID of the Webset
   * @returns The deleted Webset
   */
  async delete(id: string): Promise<Webset> {
    return this.request<Webset>(`/v0/websets/${id}`, "DELETE");
  }

  /**
   * Cancel a running Webset
   * @param id The ID of the Webset
   * @returns The canceled Webset
   */
  async cancel(id: string): Promise<Webset> {
    return this.request<Webset>(`/v0/websets/${id}/cancel`, "POST");
  }

  /**
   * Wait until a Webset is idle
   * @param id The ID of the Webset
   * @param options Configuration options
   * @returns The Webset
   * @throws Error if the Webset does not become idle within the timeout
   */
  async waitUntilIdle(id: string, options?: {
    /**
     * Maximum time to wait in milliseconds
     */
    timeout?: number;
    
    /**
     * How often to poll in milliseconds (default: 1000ms)
     */
    pollInterval?: number;
    
    /**
     * Callback function that will be called on each poll with the current status
     */
    onPoll?: (status: WebsetStatus) => void;
  } | number): Promise<Webset> {
    // For backward compatibility with the previous API
    let timeout: number | undefined;
    let pollInterval = 1000;
    let onPoll: ((status: WebsetStatus) => void) | undefined;
    
    if (typeof options === 'number') {
      // Legacy usage: waitUntilIdle(id, timeout)
      timeout = options;
    } else if (options) {
      // New options object usage
      timeout = options.timeout;
      pollInterval = options.pollInterval || 1000;
      onPoll = options.onPoll;
    }
    
    const startTime = Date.now();
    
    while (true) {
      const webset = await this.get(id);
      
      // Call the onPoll callback if provided
      if (onPoll) {
        onPoll(webset.status);
      }
      
      if (webset.status === WebsetStatus.IDLE) {
        return webset;
      }
      
      // Check for timeout before sleeping
      if (timeout && Date.now() - startTime > timeout) {
        throw new Error(
          `Webset ${id} did not reach idle state within ${timeout}ms. ` +
          `Current status: ${webset.status}`
        );
      }
      
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  }
}