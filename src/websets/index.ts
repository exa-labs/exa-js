/**
 * Barrel file for the Websets module
 */

export { WebsetsClient } from "./client";

// Export common types and enums
export type {
  CreateEnrichmentParameters,
  CreateWebhookParameters,
  CreateWebsetParameters,
  CreateWebsetSearchParameters,
  EnrichmentResult,
  Event,
  GetWebsetResponse,
  ListEventsResponse,
  ListWebhooksResponse,
  ListWebsetItemResponse,
  ListWebsetsResponse,
  UpdateWebhookParameters,
  UpdateWebsetRequest,
  Webhook,
  Webset,
  WebsetEnrichment,
  WebsetItem,
  WebsetSearch,
} from "./openapi";

export {
  CreateEnrichmentParametersFormat,
  CreateWebsetSearchParametersBehaviour,
  EventType,
  WebhookStatus,
  WebsetEnrichmentFormat,
  WebsetEnrichmentStatus,
  WebsetItemEvaluationSatisfied,
  WebsetItemSource,
  WebsetSearchCanceledReason,
  WebsetSearchStatus,
  WebsetStatus,
} from "./openapi";

// Export client classes
export { WebsetEnrichmentsClient } from "./enrichments";
export { WebsetItemsClient } from "./items";
export { WebsetSearchesClient } from "./searches";
export { WebsetWebhooksClient } from "./webhooks";

// Export helper types/interfaces
export type { ListWebsetsOptions } from "./client";
export type { ListWebhooksOptions } from "./webhooks";
