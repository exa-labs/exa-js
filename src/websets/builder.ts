/**
 * Builder pattern helpers for creating complex Webset objects
 */
import {
  CreateCriterionParameters,
  CreateEnrichmentParameters,
  CreateWebhookParameters,
  CreateWebsetParameters,
  CreateWebsetSearchParameters,
  Event,
  Option,
  Search,
  WebsetEntity,
  WebsetEnrichmentFormat,
  WebsetSearchBehaviour,
} from './types';

/**
 * Builder for creating a Webset search
 */
export class SearchBuilder {
  private search: Search;

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
    return this.withEntity({ type: 'company' });
  }

  /**
   * Add a person entity type
   * @returns The builder instance for chaining
   */
  forPeople(): SearchBuilder {
    return this.withEntity({ type: 'person' });
  }

  /**
   * Add an article entity type
   * @returns The builder instance for chaining
   */
  forArticles(): SearchBuilder {
    return this.withEntity({ type: 'article' });
  }

  /**
   * Add a research paper entity type
   * @returns The builder instance for chaining
   */
  forResearchPapers(): SearchBuilder {
    return this.withEntity({ type: 'research_paper' });
  }

  /**
   * Add a custom entity type
   * @param description Description of the custom entity
   * @returns The builder instance for chaining
   */
  forCustomEntity(description: string): SearchBuilder {
    return this.withEntity({ 
      type: 'custom', 
      description 
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
   * Build the Search object
   * @returns The constructed Search
   */
  build(): Search {
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
   * @param searchBuilder The SearchBuilder containing search parameters
   */
  constructor(searchBuilder: SearchBuilder) {
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
    return new WebsetBuilder(new SearchBuilder(query, count));
  }

  /**
   * Add an enrichment
   * @param description Description of the enrichment
   * @param format Format of the enrichment
   * @returns The builder instance for chaining
   */
  withEnrichment(
    description: string,
    format: WebsetEnrichmentFormat,
    options?: Option[]
  ): WebsetBuilder {
    if (!this.params.enrichments) {
      this.params.enrichments = [];
    }
    
    const enrichment: CreateEnrichmentParameters = {
      description,
      format
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
    return this.withEnrichment(description, WebsetEnrichmentFormat.TEXT);
  }

  /**
   * Add a number format enrichment
   * @param description Description of the enrichment
   * @returns The builder instance for chaining
   */
  withNumberEnrichment(description: string): WebsetBuilder {
    return this.withEnrichment(description, WebsetEnrichmentFormat.NUMBER);
  }

  /**
   * Add a date format enrichment
   * @param description Description of the enrichment
   * @returns The builder instance for chaining
   */
  withDateEnrichment(description: string): WebsetBuilder {
    return this.withEnrichment(description, WebsetEnrichmentFormat.DATE);
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
      WebsetEnrichmentFormat.OPTIONS,
      options.map(label => ({ label }))
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
  withMetadata(metadata: Record<string, any>): WebsetBuilder {
    this.params.metadata = {
      ...this.params.metadata,
      ...metadata
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
      events: []
    };
  }

  /**
   * Add an event to listen for
   * @param event The event type
   * @returns The builder instance for chaining
   */
  withEvent(event: Event): WebhookBuilder {
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
  withEvents(events: Event[]): WebhookBuilder {
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
    return this.withEvent(Event.WEBSET_CREATED);
  }

  /**
   * Listen for Webset deletion events
   * @returns The builder instance for chaining
   */
  onWebsetDeleted(): WebhookBuilder {
    return this.withEvent(Event.WEBSET_DELETED);
  }

  /**
   * Listen for Webset idle events
   * @returns The builder instance for chaining
   */
  onWebsetIdle(): WebhookBuilder {
    return this.withEvent(Event.WEBSET_IDLE);
  }

  /**
   * Listen for Webset item creation events
   * @returns The builder instance for chaining
   */
  onItemCreated(): WebhookBuilder {
    return this.withEvent(Event.WEBSET_ITEM_CREATED);
  }

  /**
   * Listen for Webset item enrichment events
   * @returns The builder instance for chaining
   */
  onItemEnriched(): WebhookBuilder {
    return this.withEvent(Event.WEBSET_ITEM_ENRICHED);
  }

  /**
   * Add metadata to the webhook
   * @param metadata Key-value metadata
   * @returns The builder instance for chaining
   */
  withMetadata(metadata: Record<string, any>): WebhookBuilder {
    this.params.metadata = {
      ...this.params.metadata,
      ...metadata
    };
    return this;
  }

  /**
   * Build the CreateWebhookParameters object
   * @returns The constructed parameters
   */
  build(): CreateWebhookParameters {
    if (this.params.events.length === 0) {
      throw new Error("At least one event must be specified for a webhook");
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
      count
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
    return this.withEntity({ type: 'company' });
  }

  /**
   * Add a person entity type
   * @returns The builder instance for chaining
   */
  forPeople(): WebsetSearchBuilder {
    return this.withEntity({ type: 'person' });
  }

  /**
   * Add an article entity type
   * @returns The builder instance for chaining
   */
  forArticles(): WebsetSearchBuilder {
    return this.withEntity({ type: 'article' });
  }

  /**
   * Add a research paper entity type
   * @returns The builder instance for chaining
   */
  forResearchPapers(): WebsetSearchBuilder {
    return this.withEntity({ type: 'research_paper' });
  }

  /**
   * Add a custom entity type
   * @param description Description of the custom entity
   * @returns The builder instance for chaining
   */
  forCustomEntity(description: string): WebsetSearchBuilder {
    return this.withEntity({ 
      type: 'custom', 
      description 
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
  withBehaviour(behaviour: WebsetSearchBehaviour): WebsetSearchBuilder {
    this.params.behaviour = behaviour;
    return this;
  }

  /**
   * Set the search to override existing results
   * @returns The builder instance for chaining
   */
  shouldOverride(): WebsetSearchBuilder {
    return this.withBehaviour(WebsetSearchBehaviour.OVERRIDE);
  }

  /**
   * Add metadata to the search
   * @param metadata Key-value metadata
   * @returns The builder instance for chaining
   */
  withMetadata(metadata: Record<string, any>): WebsetSearchBuilder {
    this.params.metadata = {
      ...this.params.metadata,
      ...metadata
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