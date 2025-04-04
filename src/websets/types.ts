/**
 * Websets API Type Definitions
 */

/**
 * Type for API query parameters
 */
export type QueryParams = Record<string, string | number | boolean | string[] | undefined>;

/**
 * Type for API request body
 */
export interface RequestBody {
  [key: string]: unknown;
}

/**
 * The possible cancellation reasons for a Webset search
 */
export enum CanceledReason {
  WEBSET_DELETED = "webset_deleted",
  WEBSET_CANCELED = "webset_canceled",
}

/**
 * The possible events for Webset webhooks
 */
export enum Event {
  WEBSET_CREATED = "webset.created",
  WEBSET_DELETED = "webset.deleted",
  WEBSET_PAUSED = "webset.paused",
  WEBSET_IDLE = "webset.idle",
  WEBSET_SEARCH_CREATED = "webset.search.created",
  WEBSET_SEARCH_CANCELED = "webset.search.canceled",
  WEBSET_SEARCH_COMPLETED = "webset.search.completed",
  WEBSET_SEARCH_UPDATED = "webset.search.updated",
  WEBSET_EXPORT_CREATED = "webset.export.created",
  WEBSET_EXPORT_COMPLETED = "webset.export.completed",
  WEBSET_ITEM_CREATED = "webset.item.created",
  WEBSET_ITEM_ENRICHED = "webset.item.enriched",
}

/**
 * Available formats for enrichment responses
 */
export enum WebsetEnrichmentFormat {
  TEXT = "text",
  DATE = "date",
  NUMBER = "number",
  OPTIONS = "options",
  EMAIL = "email",
  PHONE = "phone",
}

/**
 * The possible statuses for a Webset
 */
export enum WebsetStatus {
  IDLE = "idle",
  RUNNING = "running",
  PAUSED = "paused",
}

/**
 * The possible statuses for a Webset search
 */
export enum WebsetSearchStatus {
  CREATED = "created",
  RUNNING = "running",
  COMPLETED = "completed",
  CANCELED = "canceled",
}

/**
 * The possible behaviors for a Webset search
 */
export enum WebsetSearchBehaviour {
  OVERRIDE = "override",
}

/**
 * The possible statuses for a Webset webhook
 */
export enum WebhookStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
}

/**
 * The possible statuses for a Webset enrichment
 */
export enum WebsetEnrichmentStatus {
  PENDING = "pending",
  CANCELED = "canceled",
  COMPLETED = "completed",
}

/**
 * The possible sources for a Webset item
 */
export enum Source {
  SEARCH = "search",
}

/**
 * The possible satisfaction statuses for criteria evaluations
 */
export enum Satisfied {
  YES = "yes",
  NO = "no",
  UNCLEAR = "unclear",
}

/**
 * The possible export formats for Websets
 */
export enum WebsetExportFormat {
  CSV = "csv",
}

/**
 * Base interface for all entity types
 */
interface EntityBase {
  type: string;
}

/**
 * Company entity type
 */
export interface WebsetCompanyEntity extends EntityBase {
  type: "company";
}

/**
 * Person entity type
 */
export interface WebsetPersonEntity extends EntityBase {
  type: "person";
}

/**
 * Article entity type
 */
export interface WebsetArticleEntity extends EntityBase {
  type: "article";
}

/**
 * Research paper entity type
 */
export interface WebsetResearchPaperEntity extends EntityBase {
  type: "research_paper";
}

/**
 * Custom entity type with description
 */
export interface WebsetCustomEntity extends EntityBase {
  type: "custom";
  description: string;
}

/**
 * Union type of all possible entity types
 */
export type WebsetEntity =
  | WebsetCompanyEntity
  | WebsetPersonEntity
  | WebsetArticleEntity
  | WebsetResearchPaperEntity
  | WebsetCustomEntity;

/**
 * Parameters for creating a criterion
 */
export interface CreateCriterionParameters {
  description: string;
}

/**
 * Criterion with description and success rate
 */
export interface Criterion extends CreateCriterionParameters {
  successRate: number;
}

/**
 * Option for enrichment responses
 */
export interface Option {
  label: string;
}

/**
 * Webset enrichment option
 */
export interface WebsetEnrichmentOption extends Option {}

/**
 * Progress information for a search
 */
export interface Progress {
  found: number;
  completion: number;
}

/**
 * Reference used in enrichment results and evaluations
 */
export interface Reference {
  title?: string;
  snippet?: string;
  url: string;
}

/**
 * Parameters for creating a search
 */
export interface Search {
  query: string;
  count: number;
  entity?: WebsetEntity;
  criteria?: CreateCriterionParameters[];
}

/**
 * Parameters for creating a Webset
 */
export interface CreateWebsetParameters {
  search: Search;
  enrichments?: CreateEnrichmentParameters[];
  externalId?: string;
  metadata?: Record<string, any>;
}

/**
 * Parameters for creating a Webset search
 */
export interface CreateWebsetSearchParameters {
  count: number;
  query: string;
  entity?: WebsetEntity;
  criteria?: CreateCriterionParameters[];
  behaviour?: WebsetSearchBehaviour;
  metadata?: Record<string, any>;
}

/**
 * Parameters for creating an enrichment
 */
export interface CreateEnrichmentParameters {
  description: string;
  format?: WebsetEnrichmentFormat;
  options?: Option[];
  metadata?: Record<string, any>;
}

/**
 * Parameters for creating a webhook
 */
export interface CreateWebhookParameters {
  events: Event[];
  url: string;
  metadata?: Record<string, any>;
}

/**
 * Parameters for updating a webhook
 */
export interface UpdateWebhookParameters {
  events?: Event[];
  url?: string;
  metadata?: Record<string, any>;
}

/**
 * Parameters for updating a Webset
 */
export interface UpdateWebsetRequest {
  metadata?: Record<string, any>;
}

/**
 * Webhook object
 */
export interface Webhook {
  id: string;
  object: "webhook";
  status: WebhookStatus;
  events: Event[];
  url: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Enrichment result object
 */
export interface EnrichmentResult {
  object: "enrichment_result";
  format: WebsetEnrichmentFormat;
  result: string[];
  reasoning?: string;
  references: Reference[];
  enrichmentId: string;
}

/**
 * Webset enrichment object
 */
export interface WebsetEnrichment {
  id: string;
  object: "webset_enrichment";
  status: WebsetEnrichmentStatus;
  websetId: string;
  title?: string;
  description: string;
  format?: WebsetEnrichmentFormat;
  options?: WebsetEnrichmentOption[];
  instructions?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Webset search object
 */
export interface WebsetSearch {
  id: string;
  object: "webset_search";
  status: WebsetSearchStatus;
  query: string;
  entity?: WebsetEntity;
  criteria: Criterion[];
  count: number;
  progress: Progress;
  metadata?: Record<string, any>;
  canceledAt?: string;
  canceledReason?: CanceledReason;
  createdAt: string;
  updatedAt: string;
}

/**
 * Item evaluation object
 */
export interface WebsetItemEvaluation {
  criterion: string;
  reasoning: string;
  satisfied: Satisfied;
  references?: Reference[];
}

/**
 * Company properties fields
 */
export interface WebsetItemCompanyPropertiesFields {
  name: string;
  location?: string;
  employees?: number;
  industry?: string;
  about?: string;
  logoUrl?: string;
}

/**
 * Person properties fields
 */
export interface WebsetItemPersonPropertiesFields {
  name: string;
  location?: string;
  position?: string;
  pictureUrl?: string;
}

/**
 * Article properties fields
 */
export interface WebsetItemArticlePropertiesFields {
  author?: string;
  publishedAt?: string;
}

/**
 * Research paper properties fields
 */
export interface WebsetItemResearchPaperPropertiesFields {
  author?: string;
  publishedAt?: string;
}

/**
 * Custom properties fields
 */
export interface WebsetItemCustomPropertiesFields {
  author?: string;
  publishedAt?: string;
}

/**
 * Company item properties
 */
export interface WebsetItemCompanyProperties {
  type: "company";
  url: string;
  description: string;
  content?: string;
  company: WebsetItemCompanyPropertiesFields;
}

/**
 * Person item properties
 */
export interface WebsetItemPersonProperties {
  type: "person";
  url: string;
  description: string;
  person: WebsetItemPersonPropertiesFields;
}

/**
 * Article item properties
 */
export interface WebsetItemArticleProperties {
  type: "article";
  url: string;
  description: string;
  content?: string;
  article: WebsetItemArticlePropertiesFields;
}

/**
 * Research paper item properties
 */
export interface WebsetItemResearchPaperProperties {
  type: "research_paper";
  url: string;
  description: string;
  content?: string;
  researchPaper: WebsetItemResearchPaperPropertiesFields;
}

/**
 * Custom item properties
 */
export interface WebsetItemCustomProperties {
  type: "custom";
  url: string;
  description: string;
  content?: string;
  custom: WebsetItemCustomPropertiesFields;
}

/**
 * Union type for all possible item properties
 */
export type WebsetItemProperties =
  | WebsetItemCompanyProperties
  | WebsetItemPersonProperties
  | WebsetItemArticleProperties
  | WebsetItemResearchPaperProperties
  | WebsetItemCustomProperties;

/**
 * Webset item object
 */
export interface WebsetItem {
  id: string;
  object: "webset_item";
  source: Source;
  sourceId: string;
  websetId: string;
  properties: WebsetItemProperties;
  evaluations: WebsetItemEvaluation[];
  enrichments?: EnrichmentResult[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Webset object
 */
export interface Webset {
  id: string;
  object: "webset";
  status: WebsetStatus;
  externalId?: string;
  searches: WebsetSearch[];
  enrichments: WebsetEnrichment[];
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Response for getting a Webset, optionally with its items
 */
export interface GetWebsetResponse extends Webset {
  items?: WebsetItem[];
}

/**
 * Response for listing Websets
 */
export interface ListWebsetsResponse {
  data: Webset[];
  hasMore: boolean;
  nextCursor?: string;
}

/**
 * Response for listing Webset items
 */
export interface ListWebsetItemResponse {
  data: WebsetItem[];
  hasMore: boolean;
  nextCursor?: string;
}

/**
 * Response for listing webhooks
 */
export interface ListWebhooksResponse {
  data: Webhook[];
  hasMore: boolean;
  nextCursor?: string;
}

/**
 * Base interface for all event types
 */
interface EventBase {
  id: string;
  object: "event";
  type: string;
  createdAt: string;
}

/**
 * Webset created event
 */
export interface WebsetCreatedEvent extends EventBase {
  type: "webset.created";
  data: Webset;
}

/**
 * Webset deleted event
 */
export interface WebsetDeletedEvent extends EventBase {
  type: "webset.deleted";
  data: Webset;
}

/**
 * Webset idle event
 */
export interface WebsetIdleEvent extends EventBase {
  type: "webset.idle";
  data: Webset;
}

/**
 * Webset paused event
 */
export interface WebsetPausedEvent extends EventBase {
  type: "webset.paused";
  data: Webset;
}

/**
 * Webset search created event
 */
export interface WebsetSearchCreatedEvent extends EventBase {
  type: "webset.search.created";
  data: WebsetSearch;
}

/**
 * Webset search updated event
 */
export interface WebsetSearchUpdatedEvent extends EventBase {
  type: "webset.search.updated";
  data: WebsetSearch;
}

/**
 * Webset search canceled event
 */
export interface WebsetSearchCanceledEvent extends EventBase {
  type: "webset.search.canceled";
  data: WebsetSearch;
}

/**
 * Webset search completed event
 */
export interface WebsetSearchCompletedEvent extends EventBase {
  type: "webset.search.completed";
  data: WebsetSearch;
}

/**
 * Webset item created event
 */
export interface WebsetItemCreatedEvent extends EventBase {
  type: "webset.item.created";
  data: WebsetItem;
}

/**
 * Webset item enriched event
 */
export interface WebsetItemEnrichedEvent extends EventBase {
  type: "webset.item.enriched";
  data: WebsetItem;
}

/**
 * Union type for all possible event types
 */
export type WebsetEvent =
  | WebsetCreatedEvent
  | WebsetDeletedEvent
  | WebsetIdleEvent
  | WebsetPausedEvent
  | WebsetSearchCreatedEvent
  | WebsetSearchUpdatedEvent
  | WebsetSearchCanceledEvent
  | WebsetSearchCompletedEvent
  | WebsetItemCreatedEvent
  | WebsetItemEnrichedEvent;

/**
 * Response for listing events
 */
export interface ListEventsResponse {
  data: WebsetEvent[];
  hasMore: boolean;
  nextCursor?: string;
}