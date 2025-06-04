/**
 * Main client for Websets API
 */
import { Exa, ExaError, HttpStatusCode } from "../index";
import { PaginationParams, WebsetsBaseClient } from "./base";
import { WebsetEnrichmentsClient } from "./enrichments";
import { EventsClient } from "./events";
import { WebsetItemsClient } from "./items";
import { WebsetMonitorsClient } from "./monitors";
import {
  CreateWebsetParameters,
  GetWebsetResponse,
  ListWebsetsResponse,
  UpdateWebsetRequest,
  Webset,
  WebsetStatus,
} from "./openapi";
import { WebsetSearchesClient } from "./searches";
import { WebsetWebhooksClient } from "./webhooks";

/**
 * Options for listing Websets (API only supports pagination)
 */
export interface ListWebsetsOptions extends PaginationParams {}

/**
 * Client for managing Websets
 */
export class WebsetsClient extends WebsetsBaseClient {
  /**
   * Client for managing Events
   */
  events: EventsClient;

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
   * Client for managing Webset Monitors
   */
  monitors: WebsetMonitorsClient;

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
    this.events = new EventsClient(client);
    this.items = new WebsetItemsClient(client);
    this.searches = new WebsetSearchesClient(client);
    this.enrichments = new WebsetEnrichmentsClient(client);
    this.monitors = new WebsetMonitorsClient(client);
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
  async get(id: string, expand?: Array<"items">): Promise<GetWebsetResponse> {
    const params: { expand?: Array<"items"> } = {};
    if (expand) {
      params.expand = expand;
    }

    return this.request<GetWebsetResponse>(
      `/v0/websets/${id}`,
      "GET",
      undefined,
      params
    );
  }

  /**
   * List all Websets
   * @param options Pagination options (filtering by status is not supported by API)
   * @returns The list of Websets
   */
  async list(options?: ListWebsetsOptions): Promise<ListWebsetsResponse> {
    const params = this.buildPaginationParams(options);
    return this.request<ListWebsetsResponse>(
      "/v0/websets",
      "GET",
      undefined,
      params
    );
  }

  /**
   * Iterate through all Websets, handling pagination automatically
   * @param options Pagination options
   * @returns Async generator of Websets
   */
  async *listAll(options?: ListWebsetsOptions): AsyncGenerator<Webset> {
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
   * @param options Pagination options
   * @returns Promise resolving to an array of all Websets
   */
  async getAll(options?: ListWebsetsOptions): Promise<Webset[]> {
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
   * @param id The ID or external ID of the Webset
   * @returns The canceled Webset (as returned by the API)
   */
  async cancel(id: string): Promise<Webset> {
    return this.request<Webset>(`/v0/websets/${id}/cancel`, "POST");
  }

  /**
   * Wait until a Webset is idle
   * @param id The ID of the Webset
   * @param options Configuration options for timeout and polling
   * @returns The Webset once it becomes idle
   * @throws Error if the Webset does not become idle within the timeout
   */
  async waitUntilIdle(
    id: string,
    options?:
      | {
          timeout?: number;
          pollInterval?: number;
          onPoll?: (status: WebsetStatus) => void;
        }
      | number // Legacy: timeout only
  ): Promise<Webset> {
    let timeout: number | undefined;
    let pollInterval = 1000;
    let onPoll: ((status: WebsetStatus) => void) | undefined;

    // Handle legacy timeout argument or new options object
    if (typeof options === "number") {
      timeout = options;
    } else if (options) {
      timeout = options.timeout;
      pollInterval = options.pollInterval || 1000;
      onPoll = options.onPoll;
    }

    const startTime = Date.now();

    while (true) {
      const webset = await this.get(id);

      if (onPoll) {
        onPoll(webset.status);
      }

      if (webset.status === WebsetStatus.idle) {
        return webset;
      }

      if (timeout && Date.now() - startTime > timeout) {
        throw new ExaError(
          `Webset ${id} did not reach idle state within ${timeout}ms. Current status: ${webset.status}`,
          HttpStatusCode.RequestTimeout
        );
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }
  }
}
