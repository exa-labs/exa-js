/**
 * Client for managing Webset Enrichments
 */
import { WebsetsBaseClient } from "./base";
import {
  CreateEnrichmentParameters,
  UpdateEnrichmentParameters,
  WebsetEnrichment,
} from "./openapi";
import { type RequestOptions } from "../request-options";

/**
 * Client for managing Webset Enrichments
 */
export class WebsetEnrichmentsClient extends WebsetsBaseClient {
  /**
   * Create an Enrichment for a Webset
   * @param websetId The ID of the Webset
   * @param params The enrichment parameters
   * @param requestOptions Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`)
   * @returns The created Webset Enrichment
   */
  async create(
    websetId: string,
    params: CreateEnrichmentParameters,
    requestOptions?: RequestOptions
  ): Promise<WebsetEnrichment> {
    const scoped = this.withRequestOptions(requestOptions);
    return scoped.request<WebsetEnrichment>(
      `/v0/websets/${websetId}/enrichments`,
      "POST",
      params
    );
  }

  /**
   * Get an Enrichment by ID
   * @param websetId The ID of the Webset
   * @param id The ID of the Enrichment
   * @param requestOptions Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`)
   * @returns The Webset Enrichment
   */
  async get(
    websetId: string,
    id: string,
    requestOptions?: RequestOptions
  ): Promise<WebsetEnrichment> {
    const scoped = this.withRequestOptions(requestOptions);
    return scoped.request<WebsetEnrichment>(
      `/v0/websets/${websetId}/enrichments/${id}`,
      "GET"
    );
  }

  /**
   * Delete an Enrichment
   * @param websetId The ID of the Webset
   * @param id The ID of the Enrichment
   * @param requestOptions Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`)
   * @returns The deleted Webset Enrichment
   */
  async delete(
    websetId: string,
    id: string,
    requestOptions?: RequestOptions
  ): Promise<WebsetEnrichment> {
    const scoped = this.withRequestOptions(requestOptions);
    return scoped.request<WebsetEnrichment>(
      `/v0/websets/${websetId}/enrichments/${id}`,
      "DELETE"
    );
  }

  /**
   * Update an Enrichment
   * @param websetId The ID of the Webset
   * @param id The ID of the Enrichment
   * @param params The enrichment update parameters
   * @param requestOptions Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`)
   * @returns Promise that resolves when the update is complete
   */
  async update(
    websetId: string,
    id: string,
    params: UpdateEnrichmentParameters,
    requestOptions?: RequestOptions
  ): Promise<void> {
    const scoped = this.withRequestOptions(requestOptions);
    return scoped.request<void>(
      `/v0/websets/${websetId}/enrichments/${id}`,
      "PATCH",
      params
    );
  }

  /**
   * Cancel a running Enrichment
   * @param websetId The ID of the Webset
   * @param id The ID of the Enrichment
   * @param requestOptions Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`)
   * @returns The canceled Webset Enrichment
   */
  async cancel(
    websetId: string,
    id: string,
    requestOptions?: RequestOptions
  ): Promise<WebsetEnrichment> {
    const scoped = this.withRequestOptions(requestOptions);
    return scoped.request<WebsetEnrichment>(
      `/v0/websets/${websetId}/enrichments/${id}/cancel`,
      "POST"
    );
  }
}
