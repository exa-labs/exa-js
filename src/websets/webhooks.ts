/**
 * Client for managing Webset Webhooks
 */
import { PaginationParams, WebsetsBaseClient } from "./base";
import {
  CreateWebhookParameters,
  Event,
  ListWebhooksResponse,
  UpdateWebhookParameters,
  Webhook,
  WebhookStatus,
} from "./types";

/**
 * Options for listing webhooks
 */
export interface ListWebhooksOptions extends PaginationParams {
  /**
   * Filter webhooks by status
   */
  status?: WebhookStatus;
  
  /**
   * Filter webhooks that listen for a specific event
   */
  event?: Event;
}

/**
 * Client for managing Webset Webhooks
 */
export class WebsetWebhooksClient extends WebsetsBaseClient {
  /**
   * Create a Webhook
   * @param params The webhook parameters
   * @returns The created Webhook
   */
  async create(params: CreateWebhookParameters): Promise<Webhook> {
    return this.request<Webhook>("/v0/webhooks", "POST", params);
  }

  /**
   * Get a Webhook by ID
   * @param id The ID of the Webhook
   * @returns The Webhook
   */
  async get(id: string): Promise<Webhook> {
    return this.request<Webhook>(`/v0/webhooks/${id}`, "GET");
  }

  /**
   * List all Webhooks
   * @param options Pagination and filtering options
   * @returns The list of Webhooks
   */
  async list(options?: ListWebhooksOptions): Promise<ListWebhooksResponse> {
    const params = this.buildPaginationParams(options);
    
    // Add additional filtering parameters
    if (options?.status) params.status = options.status;
    if (options?.event) params.event = options.event;

    return this.request<ListWebhooksResponse>("/v0/webhooks", "GET", undefined, params);
  }
  
  /**
   * Iterate through all Webhooks, handling pagination automatically
   * @param options Pagination and filtering options
   * @returns Async generator of Webhooks
   */
  async *listAll(options?: ListWebhooksOptions): AsyncGenerator<Webhook> {
    let cursor: string | undefined = undefined;
    const pageOptions = options ? { ...options } : {};
    
    while (true) {
      pageOptions.cursor = cursor;
      const response = await this.list(pageOptions);
      
      for (const webhook of response.data) {
        yield webhook;
      }
      
      if (!response.hasMore || !response.nextCursor) {
        break;
      }
      
      cursor = response.nextCursor;
    }
  }
  
  /**
   * Collect all Webhooks into an array
   * @param options Pagination and filtering options
   * @returns Promise resolving to an array of all Webhooks
   */
  async getAll(options?: ListWebhooksOptions): Promise<Webhook[]> {
    const webhooks: Webhook[] = [];
    for await (const webhook of this.listAll(options)) {
      webhooks.push(webhook);
    }
    return webhooks;
  }

  /**
   * Update a Webhook
   * @param id The ID of the Webhook
   * @param params The webhook update parameters
   * @returns The updated Webhook
   */
  async update(
    id: string,
    params: UpdateWebhookParameters
  ): Promise<Webhook> {
    return this.request<Webhook>(`/v0/webhooks/${id}`, "PATCH", params);
  }
  
  /**
   * Activate a Webhook
   * @param id The ID of the Webhook
   * @returns The activated Webhook
   */
  async activate(id: string): Promise<Webhook> {
    return this.update(id, { status: WebhookStatus.ACTIVE });
  }
  
  /**
   * Deactivate a Webhook
   * @param id The ID of the Webhook
   * @returns The deactivated Webhook
   */
  async deactivate(id: string): Promise<Webhook> {
    return this.update(id, { status: WebhookStatus.INACTIVE });
  }

  /**
   * Delete a Webhook
   * @param id The ID of the Webhook
   * @returns The deleted Webhook
   */
  async delete(id: string): Promise<Webhook> {
    return this.request<Webhook>(`/v0/webhooks/${id}`, "DELETE");
  }
}