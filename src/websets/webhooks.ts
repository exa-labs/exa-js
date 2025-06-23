/**
 * Client for managing Webset Webhooks
 */
import { PaginationParams, WebsetsBaseClient } from "./base";
import {
  CreateWebhookParameters,
  EventType,
  ListWebhookAttemptsResponse,
  ListWebhooksResponse,
  UpdateWebhookParameters,
  Webhook,
  WebhookAttempt,
} from "./openapi";

/**
 * Options for listing webhooks (only pagination is supported by API)
 */
export interface ListWebhooksOptions extends PaginationParams {}

/**
 * Options for listing webhook attempts
 */
export interface ListWebhookAttemptsOptions extends PaginationParams {
  /**
   * The type of event to filter by
   */
  eventType?: EventType;
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
   * @param options Pagination options
   * @returns The list of Webhooks
   */
  async list(options?: ListWebhooksOptions): Promise<ListWebhooksResponse> {
    const params = this.buildPaginationParams(options);
    return this.request<ListWebhooksResponse>(
      "/v0/webhooks",
      "GET",
      undefined,
      params
    );
  }

  /**
   * Iterate through all Webhooks, handling pagination automatically
   * @param options Pagination options
   * @returns Async generator of Webhooks
   */
  async *listAll(options?: ListWebhooksOptions): AsyncGenerator<Webhook> {
    let cursor: string | undefined = undefined;
    const pageOptions: any = {};
    
    if (options?.cursor !== undefined) pageOptions.cursor = options.cursor;
    if (options?.limit !== undefined) pageOptions.limit = options.limit;

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
   * @param options Pagination options
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
   * @param params The webhook update parameters (events, metadata, url)
   * @returns The updated Webhook
   */
  async update(id: string, params: UpdateWebhookParameters): Promise<Webhook> {
    return this.request<Webhook>(`/v0/webhooks/${id}`, "PATCH", params);
  }

  /**
   * Delete a Webhook
   * @param id The ID of the Webhook
   * @returns The deleted Webhook
   */
  async delete(id: string): Promise<Webhook> {
    return this.request<Webhook>(`/v0/webhooks/${id}`, "DELETE");
  }

  /**
   * List all attempts for a Webhook
   * @param id The ID of the Webhook
   * @param options Pagination and filtering options
   * @returns The list of Webhook attempts
   */
  async listAttempts(
    id: string,
    options?: ListWebhookAttemptsOptions
  ): Promise<ListWebhookAttemptsResponse> {
    const params = {
      cursor: options?.cursor,
      limit: options?.limit,
      eventType: options?.eventType,
    };

    return this.request<ListWebhookAttemptsResponse>(
      `/v0/webhooks/${id}/attempts`,
      "GET",
      undefined,
      params
    );
  }

  /**
   * Iterate through all attempts for a Webhook, handling pagination automatically
   * @param id The ID of the Webhook
   * @param options Pagination and filtering options
   * @returns Async generator of Webhook attempts
   */
  async *listAllAttempts(
    id: string,
    options?: ListWebhookAttemptsOptions
  ): AsyncGenerator<WebhookAttempt> {
    let cursor: string | undefined = undefined;
    const pageOptions: any = {};
    
    if (options?.cursor !== undefined) pageOptions.cursor = options.cursor;
    if (options?.limit !== undefined) pageOptions.limit = options.limit;
    if (options?.eventType !== undefined) pageOptions.eventType = options.eventType;

    while (true) {
      pageOptions.cursor = cursor;
      const response = await this.listAttempts(id, pageOptions);

      for (const attempt of response.data) {
        yield attempt;
      }

      if (!response.hasMore || !response.nextCursor) {
        break;
      }

      cursor = response.nextCursor;
    }
  }

  /**
   * Collect all attempts for a Webhook into an array
   * @param id The ID of the Webhook
   * @param options Pagination and filtering options
   * @returns Promise resolving to an array of all Webhook attempts
   */
  async getAllAttempts(
    id: string,
    options?: ListWebhookAttemptsOptions
  ): Promise<WebhookAttempt[]> {
    const attempts: WebhookAttempt[] = [];
    for await (const attempt of this.listAllAttempts(id, options)) {
      attempts.push(attempt);
    }
    return attempts;
  }
}
