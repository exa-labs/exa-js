/**
 * Builder pattern helpers for creating complex Webset objects
 */
import { ExaError, HttpStatusCode } from "../errors";
import {
  CreateCriterionParameters,
  CreateEnrichmentParameters,
  CreateEnrichmentParametersFormat,
  CreateWebhookParameters,
  CreateWebsetParameters,
  CreateWebsetSearchParameters,
  CreateWebsetSearchParametersBehaviour,
  EventType,
  WebsetEntity,
} from "./openapi";

// Define helper types locally
type Option = { label: string };
type InternalSearchParameters = {
  query: string;
  count: number;
  entity?: WebsetEntity;
  criteria?: CreateCriterionParameters[];
};

/**
 * Builder for creating Webset search parameters object (used internally by WebsetBuilder).
 */
export class SearchBuilder {
  private search: InternalSearchParameters;

  /**
   * Create a new SearchBuilder
   * @param query The search query
   * @param count Number of results to find
   */
  constructor(query: string, count: number) {
    this.search = {
      query,
      count,
    };
  }

  /**
   * Set the entity type to target
   * @param entity The entity type
   * @returns The builder instance for chaining
   */
  withEntity(entity: WebsetEntity): SearchBuilder {
    this.search.entity = entity;
    return this;
  }

  /**
   * Add a company entity type
   * @returns The builder instance for chaining
   */
  forCompanies(): SearchBuilder {
    return this.withEntity({ type: "company" });
  }

  /**
   * Add a person entity type
   * @returns The builder instance for chaining
   */
  forPeople(): SearchBuilder {
    return this.withEntity({ type: "person" });
  }

  /**
   * Add an article entity type
   * @returns The builder instance for chaining
   */
  forArticles(): SearchBuilder {
    return this.withEntity({ type: "article" });
  }

  /**
   * Add a research paper entity type
   * @returns The builder instance for chaining
   */
  forResearchPapers(): SearchBuilder {
    return this.withEntity({ type: "research_paper" });
  }

  /**
   * Add a custom entity type
   * @param description Description of the custom entity
   * @returns The builder instance for chaining
   */
  forCustomEntity(description: string): SearchBuilder {
    return this.withEntity({
      type: "custom",
      description,
    });
  }

  /**
   * Add a criterion for filtering search results
   * @param description Description of the criterion
   * @returns The builder instance for chaining
   */
  withCriterion(description: string): SearchBuilder {
    if (!this.search.criteria) {
      this.search.criteria = [];
    }

    this.search.criteria.push({ description });
    return this;
  }

  /**
   * Add multiple criteria for filtering search results
   * @param criteria Array of criterion descriptions
   * @returns The builder instance for chaining
   */
  withCriteria(criteria: string[]): SearchBuilder {
    if (!this.search.criteria) {
      this.search.criteria = [];
    }

    for (const description of criteria) {
      this.search.criteria.push({ description });
    }

    return this;
  }

  /**
   * Build the internal Search parameters object
   * @returns The constructed Search parameters
   */
  build(): InternalSearchParameters {
    return { ...this.search };
  }
}

/**
 * Builder for creating a Webset
 */
export class WebsetBuilder {
  private params: CreateWebsetParameters;

  /**
   * Create a new WebsetBuilder
   * @param searchBuilder The WebsetSearchBuilder containing search parameters
   */
  constructor(searchBuilder: WebsetSearchBuilder) {
    this.params = {
      search: searchBuilder.build(),
    };
  }

  /**
   * Create a new WebsetBuilder
   * @param query The search query
   * @param count Number of results to find
   * @returns A new WebsetBuilder
   */
  static withSearch(query: string, count: number): WebsetBuilder {
    return new WebsetBuilder(new WebsetSearchBuilder(query, count));
  }

  /**
   * Add an enrichment
   * @param description Description of the enrichment
   * @param format Format of the enrichment
   * @returns The builder instance for chaining
   */
  withEnrichment(
    description: string,
    format: CreateEnrichmentParametersFormat,
    options?: Option[]
  ): WebsetBuilder {
    if (!this.params.enrichments) {
      this.params.enrichments = [];
    }

    const enrichment: CreateEnrichmentParameters = {
      description,
      format,
    };

    if (options) {
      enrichment.options = options;
    }

    this.params.enrichments.push(enrichment);
    return this;
  }

  /**
   * Add a text format enrichment
   * @param description Description of the enrichment
   * @returns The builder instance for chaining
   */
  withTextEnrichment(description: string): WebsetBuilder {
    return this.withEnrichment(
      description,
      CreateEnrichmentParametersFormat.text
    );
  }

  /**
   * Add a number format enrichment
   * @param description Description of the enrichment
   * @returns The builder instance for chaining
   */
  withNumberEnrichment(description: string): WebsetBuilder {
    return this.withEnrichment(
      description,
      CreateEnrichmentParametersFormat.number
    );
  }

  /**
   * Add a date format enrichment
   * @param description Description of the enrichment
   * @returns The builder instance for chaining
   */
  withDateEnrichment(description: string): WebsetBuilder {
    return this.withEnrichment(
      description,
      CreateEnrichmentParametersFormat.date
    );
  }

  /**
   * Add an email format enrichment
   * @param description Description of the enrichment
   * @returns The builder instance for chaining
   */
  withEmailEnrichment(description: string): WebsetBuilder {
    return this.withEnrichment(
      description,
      CreateEnrichmentParametersFormat.email
    );
  }

  /**
   * Add a phone format enrichment
   * @param description Description of the enrichment
   * @returns The builder instance for chaining
   */
  withPhoneEnrichment(description: string): WebsetBuilder {
    return this.withEnrichment(
      description,
      CreateEnrichmentParametersFormat.phone
    );
  }

  /**
   * Add an options format enrichment
   * @param description Description of the enrichment
   * @param options Array of options
   * @returns The builder instance for chaining
   */
  withOptionsEnrichment(description: string, options: string[]): WebsetBuilder {
    return this.withEnrichment(
      description,
      CreateEnrichmentParametersFormat.options,
      options.map((label) => ({ label }))
    );
  }

  /**
   * Set an external ID for the Webset
   * @param externalId The external ID
   * @returns The builder instance for chaining
   */
  withExternalId(externalId: string): WebsetBuilder {
    this.params.externalId = externalId;
    return this;
  }

  /**
   * Add metadata to the Webset
   * @param metadata Key-value metadata
   * @returns The builder instance for chaining
   */
  withMetadata(metadata: Record<string, string>): WebsetBuilder {
    this.params.metadata = {
      ...(this.params.metadata || {}),
      ...metadata,
    };
    return this;
  }

  /**
   * Build the CreateWebsetParameters object
   * @returns The constructed parameters
   */
  build(): CreateWebsetParameters {
    return { ...this.params };
  }
}

/**
 * Builder for creating a webhook
 */
export class WebhookBuilder {
  private params: CreateWebhookParameters;

  /**
   * Create a new WebhookBuilder
   * @param url The webhook URL
   */
  constructor(url: string) {
    this.params = {
      url,
      events: [],
    };
  }

  /**
   * Add an event to listen for
   * @param event The event type
   * @returns The builder instance for chaining
   */
  withEvent(event: EventType): WebhookBuilder {
    if (!this.params.events) {
      this.params.events = [];
    }
    if (!this.params.events.includes(event)) {
      this.params.events.push(event);
    }
    return this;
  }

  /**
   * Add multiple events to listen for
   * @param events Array of event types
   * @returns The builder instance for chaining
   */
  withEvents(events: EventType[]): WebhookBuilder {
    for (const event of events) {
      this.withEvent(event);
    }
    return this;
  }

  /**
   * Listen for Webset creation events
   * @returns The builder instance for chaining
   */
  onWebsetCreated(): WebhookBuilder {
    return this.withEvent(EventType.webset_created);
  }

  /**
   * Listen for Webset deletion events
   * @returns The builder instance for chaining
   */
  onWebsetDeleted(): WebhookBuilder {
    return this.withEvent(EventType.webset_deleted);
  }

  /**
   * Listen for Webset paused events
   * @returns The builder instance for chaining
   */
  onWebsetPaused(): WebhookBuilder {
    return this.withEvent(EventType.webset_paused);
  }

  /**
   * Listen for Webset idle events
   * @returns The builder instance for chaining
   */
  onWebsetIdle(): WebhookBuilder {
    return this.withEvent(EventType.webset_idle);
  }

  /**
   * Listen for Webset search created events
   * @returns The builder instance for chaining
   */
  onWebsetSearchCreated(): WebhookBuilder {
    return this.withEvent(EventType.webset_search_created);
  }

  /**
   * Listen for Webset search canceled events
   * @returns The builder instance for chaining
   */
  onWebsetSearchCanceled(): WebhookBuilder {
    return this.withEvent(EventType.webset_search_canceled);
  }

  /**
   * Listen for Webset search completed events
   * @returns The builder instance for chaining
   */
  onWebsetSearchCompleted(): WebhookBuilder {
    return this.withEvent(EventType.webset_search_completed);
  }

  /**
   * Listen for Webset search updated events
   * @returns The builder instance for chaining
   */
  onWebsetSearchUpdated(): WebhookBuilder {
    return this.withEvent(EventType.webset_search_updated);
  }

  /**
   * Listen for Webset item creation events
   * @returns The builder instance for chaining
   */
  onItemCreated(): WebhookBuilder {
    return this.withEvent(EventType.webset_item_created);
  }

  /**
   * Listen for Webset item enrichment events
   * @returns The builder instance for chaining
   */
  onItemEnriched(): WebhookBuilder {
    return this.withEvent(EventType.webset_item_enriched);
  }

  /**
   * Add metadata to the webhook
   * @param metadata Key-value metadata
   * @returns The builder instance for chaining
   */
  withMetadata(metadata: Record<string, string>): WebhookBuilder {
    this.params.metadata = {
      ...(this.params.metadata || {}),
      ...metadata,
    };
    return this;
  }

  /**
   * Build the CreateWebhookParameters object
   * @returns The constructed parameters
   */
  build(): CreateWebhookParameters {
    if (this.params.events.length === 0) {
      throw new ExaError(
        "At least one event must be specified for a webhook",
        HttpStatusCode.BadRequest
      );
    }
    return { ...this.params };
  }
}

/**
 * Builder for creating a search for an existing Webset
 */
export class WebsetSearchBuilder {
  private params: CreateWebsetSearchParameters;

  /**
   * Create a new WebsetSearchBuilder
   * @param query The search query
   * @param count Number of results to find
   */
  constructor(query: string, count: number) {
    this.params = {
      query,
      count,
      behaviour: CreateWebsetSearchParametersBehaviour.override,
    };
  }

  /**
   * Set the entity type to target
   * @param entity The entity type
   * @returns The builder instance for chaining
   */
  withEntity(entity: WebsetEntity): WebsetSearchBuilder {
    this.params.entity = entity;
    return this;
  }

  /**
   * Add a company entity type
   * @returns The builder instance for chaining
   */
  forCompanies(): WebsetSearchBuilder {
    return this.withEntity({ type: "company" });
  }

  /**
   * Add a person entity type
   * @returns The builder instance for chaining
   */
  forPeople(): WebsetSearchBuilder {
    return this.withEntity({ type: "person" });
  }

  /**
   * Add an article entity type
   * @returns The builder instance for chaining
   */
  forArticles(): WebsetSearchBuilder {
    return this.withEntity({ type: "article" });
  }

  /**
   * Add a research paper entity type
   * @returns The builder instance for chaining
   */
  forResearchPapers(): WebsetSearchBuilder {
    return this.withEntity({ type: "research_paper" });
  }

  /**
   * Add a custom entity type
   * @param description Description of the custom entity
   * @returns The builder instance for chaining
   */
  forCustomEntity(description: string): WebsetSearchBuilder {
    return this.withEntity({
      type: "custom",
      description,
    });
  }

  /**
   * Add a criterion for filtering search results
   * @param description Description of the criterion
   * @returns The builder instance for chaining
   */
  withCriterion(description: string): WebsetSearchBuilder {
    if (!this.params.criteria) {
      this.params.criteria = [];
    }

    this.params.criteria.push({ description });
    return this;
  }

  /**
   * Add multiple criteria for filtering search results
   * @param criteria Array of criterion descriptions
   * @returns The builder instance for chaining
   */
  withCriteria(criteria: string[]): WebsetSearchBuilder {
    if (!this.params.criteria) {
      this.params.criteria = [];
    }

    for (const description of criteria) {
      this.params.criteria.push({ description });
    }

    return this;
  }

  /**
   * Set the search behavior
   * @param behaviour The search behavior
   * @returns The builder instance for chaining
   */
  withBehaviour(
    behaviour: CreateWebsetSearchParametersBehaviour
  ): WebsetSearchBuilder {
    this.params.behaviour = behaviour;
    return this;
  }

  /**
   * Set the search to override existing results
   * @returns The builder instance for chaining
   */
  shouldOverride(): WebsetSearchBuilder {
    return this.withBehaviour(CreateWebsetSearchParametersBehaviour.override);
  }

  /**
   * Add metadata to the search
   * @param metadata Key-value metadata
   * @returns The builder instance for chaining
   */
  withMetadata(metadata: Record<string, string>): WebsetSearchBuilder {
    this.params.metadata = {
      ...(this.params.metadata || {}),
      ...metadata,
    };
    return this;
  }

  /**
   * Build the CreateWebsetSearchParameters object
   * @returns The constructed parameters
   */
  build(): CreateWebsetSearchParameters {
    return { ...this.params };
  }
}
