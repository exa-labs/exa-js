/**
 * Main client for Websets API
 */
import { WebsetsBaseClient } from "./base";
import { WebsetItemsClient } from "./items";
import { WebsetSearchesClient } from "./searches";
import { WebsetEnrichmentsClient } from "./enrichments";
import { WebsetWebhooksClient } from "./webhooks";
import {
  CreateWebsetParameters,
  GetWebsetResponse,
  ListWebsetsResponse,
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
  constructor(client: any) {
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
    return this.request("/v0/websets", "POST", params);
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
    const params: Record<string, any> = {};
    if (expand && expand.length > 0) {
      params.expand = expand;
    }

    return this.request(`/v0/websets/${id}`, "GET", undefined, params);
  }

  /**
   * List all Websets
   * @param cursor Optional cursor for pagination
   * @param limit Optional limit for pagination
   * @returns The list of Websets
   */
  async list(
    cursor?: string,
    limit?: number
  ): Promise<ListWebsetsResponse> {
    const params: Record<string, any> = {};
    if (cursor) params.cursor = cursor;
    if (limit) params.limit = limit;

    return this.request("/v0/websets", "GET", undefined, params);
  }

  /**
   * Update a Webset
   * @param id The ID of the Webset
   * @param params The Webset update parameters
   * @returns The updated Webset
   */
  async update(id: string, params: UpdateWebsetRequest): Promise<Webset> {
    return this.request(`/v0/websets/${id}`, "POST", params);
  }

  /**
   * Delete a Webset
   * @param id The ID of the Webset
   * @returns The deleted Webset
   */
  async delete(id: string): Promise<Webset> {
    return this.request(`/v0/websets/${id}`, "DELETE");
  }

  /**
   * Cancel a running Webset
   * @param id The ID of the Webset
   * @returns The canceled Webset
   */
  async cancel(id: string): Promise<Webset> {
    return this.request(`/v0/websets/${id}/cancel`, "POST");
  }

  /**
   * Wait until a Webset is idle
   * @param id The ID of the Webset
   * @param timeout Optional timeout in milliseconds
   * @returns The Webset
   * @throws Error if the Webset does not become idle within the timeout
   */
  async waitUntilIdle(id: string, timeout?: number): Promise<Webset> {
    const startTime = Date.now();
    
    while (true) {
      const webset = await this.get(id);
      
      if (webset.status === WebsetStatus.IDLE) {
        return webset;
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (timeout && Date.now() - startTime > timeout) {
        throw new Error("Webset timed out");
      }
    }
  }
}