/**
 * Barrel file for the Websets module
 */

export { WebsetsClient } from "./client";

// Export common types and enums
export type {
  CreateEnrichmentParameters,
  CreateStreamParameters,
  CreateWebhookParameters,
  CreateWebsetParameters,
  CreateWebsetSearchParameters,
  EnrichmentResult,
  Event,
  GetWebsetResponse,
  ListEventsResponse,
  ListStreamRunsResponse,
  ListStreamsResponse,
  ListWebhooksResponse,
  ListWebsetItemResponse,
  ListWebsetsResponse,
  Stream,
  StreamRun,
  UpdateStream,
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
  EventType,
  UpdateStreamStatus,
  WebhookStatus,
  WebsetEnrichmentFormat,
  WebsetEnrichmentStatus,
  WebsetItemEvaluationSatisfied,
  WebsetItemSource,
  WebsetSearchBehavior,
  WebsetSearchCanceledReason,
  WebsetSearchStatus,
  WebsetStatus,
} from "./openapi";

// Export client classes
export { WebsetEnrichmentsClient } from "./enrichments";
export { WebsetItemsClient } from "./items";
export { WebsetSearchesClient } from "./searches";
export { WebsetStreamsClient } from "./streams";
export { WebsetWebhooksClient } from "./webhooks";

// Export helper types/interfaces
export type { ListWebsetsOptions } from "./client";
export type { ListStreamsOptions } from "./streams";
export type { ListWebhooksOptions } from "./webhooks";
