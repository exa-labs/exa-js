/**
 * Websets API client
 */

export { WebsetsClient } from "./client";
export { WebsetEnrichmentsClient } from "./enrichments";
export { EventsClient } from "./events";
export { ImportsClient } from "./imports";
export { WebsetItemsClient } from "./items";
export { WebsetSearchesClient } from "./searches";
export { WebsetWebhooksClient } from "./webhooks";

// Export OpenAPI types
export type {
  ArticleEntity,
  CompanyEntity,
  CreateCriterionParameters,
  CreateEnrichmentParameters,
  CreateImportParameters,
  CreateImportResponse,
  CreateMonitorParameters,
  CreateWebhookParameters,
  CreateWebsetParameters,
  CreateWebsetSearchParameters,
  CustomEntity,
  EnrichmentResult,
  Entity,
  Event,
  GetWebsetResponse,
  Import,
  ListEventsResponse,
  ListImportsResponse,
  ListMonitorRunsResponse,
  ListMonitorsResponse,
  ListWebhookAttemptsResponse,
  ListWebhooksResponse,
  ListWebsetItemResponse,
  ListWebsetsResponse,
  Monitor,
  MonitorBehavior,
  MonitorCadence,
  MonitorRun,
  PersonEntity,
  PreviewWebsetParameters,
  PreviewWebsetResponse,
  ResearchPaperEntity,
  UpdateEnrichmentParameters,
  UpdateImport,
  UpdateMonitor,
  UpdateWebhookParameters,
  UpdateWebsetRequest,
  Webhook,
  WebhookAttempt,
  Webset,
  WebsetEnrichment,
  WebsetItem,
  WebsetItemArticleProperties,
  WebsetItemCompanyProperties,
  WebsetItemCustomProperties,
  WebsetItemEvaluation,
  WebsetItemPersonProperties,
  WebsetItemResearchPaperProperties,
  WebsetSearch,
} from "./openapi";

// Export enums
export {
  CreateEnrichmentParametersFormat,
  CreateImportParametersFormat,
  EventType,
  ImportFailedReason,
  ImportFormat,
  ImportObject,
  ImportStatus,
  MonitorObject,
  MonitorRunObject,
  MonitorRunStatus,
  MonitorRunType,
  MonitorStatus,
  UpdateMonitorStatus,
  WebhookStatus,
  WebsetEnrichmentFormat,
  WebsetEnrichmentStatus,
  WebsetImportSource,
  WebsetItemEvaluationSatisfied,
  WebsetItemSource,
  WebsetSearchBehavior,
  WebsetSearchCanceledReason,
  WebsetSearchExcludeSource,
  WebsetSearchScopeSource,
  WebsetSearchStatus,
  WebsetStatus,
} from "./openapi";

// Export client classes
export { WebsetMonitorsClient } from "./monitors";

// Export types from specific modules
export type {
  CreateImportWithCsvParameters,
  CsvDataInput,
  WaitUntilCompletedOptions,
} from "./imports";
export type { ListWebsetItemsOptions } from "./items";
export type { ListMonitorsOptions } from "./monitors";

export type WebsetHeadersLike = {
  "x-exa-websets-priority"?: "low" | "medium" | "high";
} & Record<string, string>;
