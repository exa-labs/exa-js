/**
 * Client for managing Webset Webhooks
 */
import { WebsetsBaseClient } from "./base";
import {
  CreateWebhookParameters,
  ListWebhooksResponse,
  UpdateWebhookParameters,
  Webhook,
} from "./types";

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
    return this.request("/v0/webhooks", "POST", params);
  }

  /**
   * Get a Webhook by ID
   * @param id The ID of the Webhook
   * @returns The Webhook
   */
  async get(id: string): Promise<Webhook> {
    return this.request(`/v0/webhooks/${id}`, "GET");
  }

  /**
   * List all Webhooks
   * @param cursor Optional cursor for pagination
   * @param limit Optional limit for pagination
   * @returns The list of Webhooks
   */
  async list(
    cursor?: string,
    limit?: number
  ): Promise<ListWebhooksResponse> {
    const params: Record<string, any> = {};
    if (cursor) params.cursor = cursor;
    if (limit) params.limit = limit;

    return this.request("/v0/webhooks", "GET", undefined, params);
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
    return this.request(`/v0/webhooks/${id}`, "PATCH", params);
  }

  /**
   * Delete a Webhook
   * @param id The ID of the Webhook
   * @returns The deleted Webhook
   */
  async delete(id: string): Promise<Webhook> {
    return this.request(`/v0/webhooks/${id}`, "DELETE");
  }
}