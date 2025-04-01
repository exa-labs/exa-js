/**
 * Client for managing Webset Enrichments
 */
import { WebsetsBaseClient } from "./base";
import { CreateEnrichmentParameters, WebsetEnrichment } from "./types";

/**
 * Client for managing Webset Enrichments
 */
export class WebsetEnrichmentsClient extends WebsetsBaseClient {
  /**
   * Create an Enrichment for a Webset
   * @param websetId The ID of the Webset
   * @param params The enrichment parameters
   * @returns The created Webset Enrichment
   */
  async create(
    websetId: string,
    params: CreateEnrichmentParameters
  ): Promise<WebsetEnrichment> {
    return this.request<WebsetEnrichment>(`/v0/websets/${websetId}/enrichments`, "POST", params);
  }

  /**
   * Get an Enrichment by ID
   * @param websetId The ID of the Webset
   * @param id The ID of the Enrichment
   * @returns The Webset Enrichment
   */
  async get(websetId: string, id: string): Promise<WebsetEnrichment> {
    return this.request<WebsetEnrichment>(`/v0/websets/${websetId}/enrichments/${id}`, "GET");
  }

  /**
   * Delete an Enrichment
   * @param websetId The ID of the Webset
   * @param id The ID of the Enrichment
   * @returns The deleted Webset Enrichment
   */
  async delete(websetId: string, id: string): Promise<WebsetEnrichment> {
    return this.request<WebsetEnrichment>(`/v0/websets/${websetId}/enrichments/${id}`, "DELETE");
  }

  /**
   * Cancel a running Enrichment
   * @param websetId The ID of the Webset
   * @param id The ID of the Enrichment
   * @returns The canceled Webset Enrichment
   */
  async cancel(websetId: string, id: string): Promise<WebsetEnrichment> {
    return this.request<WebsetEnrichment>(
      `/v0/websets/${websetId}/enrichments/${id}/cancel`,
      "POST"
    );
  }
}