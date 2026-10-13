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
import { type RequestOptions } from "../request-options";

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
  /**
   * Filter attempts by their success status
   */
  successful?: boolean;
}

/**
 * Client for managing Webset Webhooks
 */
export class WebsetWebhooksClient extends WebsetsBaseClient {
  /**
   * Create a Webhook
   * @param params The webhook parameters
   * @param requestOptions Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`)
   * @returns The created Webhook
   */
  async create(
    params: CreateWebhookParameters,
    requestOptions?: RequestOptions
  ): Promise<Webhook> {
    const scoped = this.withRequestOptions(requestOptions);
    return scoped.request<Webhook>("/v0/webhooks", "POST", params);
  }

  /**
   * Get a Webhook by ID
   * @param id The ID of the Webhook
   * @param requestOptions Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`)
   * @returns The Webhook
   */
  async get(id: string, requestOptions?: RequestOptions): Promise<Webhook> {
    const scoped = this.withRequestOptions(requestOptions);
    return scoped.request<Webhook>(`/v0/webhooks/${id}`, "GET");
  }

  /**
   * List all Webhooks
   * @param options Pagination options
   * @param requestOptions Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`)
   * @returns The list of Webhooks
   */
  async list(
    options?: ListWebhooksOptions,
    requestOptions?: RequestOptions
  ): Promise<ListWebhooksResponse> {
    const scoped = this.withRequestOptions(requestOptions);
    const params = this.buildPaginationParams(options);
    return scoped.request<ListWebhooksResponse>(
      "/v0/webhooks",
      "GET",
      undefined,
      params
    );
  }

  /**
   * Iterate through all Webhooks, handling pagination automatically
   * @param options Pagination options
   * @param requestOptions Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`)
   * @returns Async generator of Webhooks
   */
  async *listAll(
    options?: ListWebhooksOptions,
    requestOptions?: RequestOptions
  ): AsyncGenerator<Webhook> {
    let scoped = this.withRequestOptions(requestOptions);
    let cursor: string | undefined = undefined;
    const pageOptions = options ? { ...options } : {};

    while (true) {
      pageOptions.cursor = cursor;
      const response = await scoped.list(pageOptions);

      for (const webhook of response.data) {
        yield webhook;
      }

      if (!response.hasMore || !response.nextCursor) {
        break;
      }

      cursor = response.nextCursor;
      scoped = scoped.forNextPage();
    }
  }

  /**
   * Collect all Webhooks into an array
   * @param options Pagination options
   * @param requestOptions Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`)
   * @returns Promise resolving to an array of all Webhooks
   */
  async getAll(
    options?: ListWebhooksOptions,
    requestOptions?: RequestOptions
  ): Promise<Webhook[]> {
    const scoped = this.withRequestOptions(requestOptions);
    const webhooks: Webhook[] = [];
    for await (const webhook of scoped.listAll(options)) {
      webhooks.push(webhook);
    }
    return webhooks;
  }

  /**
   * Update a Webhook
   * @param id The ID of the Webhook
   * @param params The webhook update parameters (events, metadata, url)
   * @param requestOptions Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`)
   * @returns The updated Webhook
   */
  async update(
    id: string,
    params: UpdateWebhookParameters,
    requestOptions?: RequestOptions
  ): Promise<Webhook> {
    const scoped = this.withRequestOptions(requestOptions);
    return scoped.request<Webhook>(`/v0/webhooks/${id}`, "PATCH", params);
  }

  /**
   * Delete a Webhook
   * @param id The ID of the Webhook
   * @param requestOptions Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`)
   * @returns The deleted Webhook
   */
  async delete(id: string, requestOptions?: RequestOptions): Promise<Webhook> {
    const scoped = this.withRequestOptions(requestOptions);
    return scoped.request<Webhook>(`/v0/webhooks/${id}`, "DELETE");
  }

  /**
   * List all attempts for a Webhook
   * @param id The ID of the Webhook
   * @param options Pagination and filtering options
   * @param requestOptions Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`)
   * @returns The list of Webhook attempts
   */
  async listAttempts(
    id: string,
    options?: ListWebhookAttemptsOptions,
    requestOptions?: RequestOptions
  ): Promise<ListWebhookAttemptsResponse> {
    const scoped = this.withRequestOptions(requestOptions);
    const params = {
      cursor: options?.cursor,
      limit: options?.limit,
      eventType: options?.eventType,
      successful: options?.successful,
    };

    return scoped.request<ListWebhookAttemptsResponse>(
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
   * @param requestOptions Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`)
   * @returns Async generator of Webhook attempts
   */
  async *listAllAttempts(
    id: string,
    options?: ListWebhookAttemptsOptions,
    requestOptions?: RequestOptions
  ): AsyncGenerator<WebhookAttempt> {
    let scoped = this.withRequestOptions(requestOptions);
    let cursor: string | undefined = undefined;
    const pageOptions = options ? { ...options } : {};

    while (true) {
      pageOptions.cursor = cursor;
      const response = await scoped.listAttempts(id, pageOptions);

      for (const attempt of response.data) {
        yield attempt;
      }

      if (!response.hasMore || !response.nextCursor) {
        break;
      }

      cursor = response.nextCursor;
      scoped = scoped.forNextPage();
    }
  }

  /**
   * Collect all attempts for a Webhook into an array
   * @param id The ID of the Webhook
   * @param options Pagination and filtering options
   * @param requestOptions Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`)
   * @returns Promise resolving to an array of all Webhook attempts
   */
  async getAllAttempts(
    id: string,
    options?: ListWebhookAttemptsOptions,
    requestOptions?: RequestOptions
  ): Promise<WebhookAttempt[]> {
    const scoped = this.withRequestOptions(requestOptions);
    const attempts: WebhookAttempt[] = [];
    for await (const attempt of scoped.listAllAttempts(id, options)) {
      attempts.push(attempt);
    }
    return attempts;
  }
}
