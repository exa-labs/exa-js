import fetch, { Headers } from "cross-fetch";
import { ZodSchema } from "zod";
import packageJson from "../package.json";
import { ExaError, HttpStatusCode } from "./errors";
import { ResearchClient } from "./research/client";
import { WebsetsClient } from "./websets/client";
import { isZodSchema, zodToJsonSchema } from "./zod-utils";

// Use native fetch in Node.js environments
const fetchImpl =
  typeof global !== "undefined" && global.fetch ? global.fetch : fetch;
const HeadersImpl =
  typeof global !== "undefined" && global.Headers ? global.Headers : Headers;

const DEFAULT_MAX_CHARACTERS = 10_000;

/**
 * Options for retrieving page contents
 * @typedef {Object} ContentsOptions
 * @property {TextContentsOptions | boolean} [text] - Options for retrieving text contents.
 * @property {HighlightsContentsOptions | boolean} [highlights] - Options for retrieving highlights. NOTE: For search type "deep", only "true" is allowed. "query", "numSentences" and "highlightsPerUrl" will not be respected.
 * @property {SummaryContentsOptions | boolean} [summary] - Options for retrieving summary.
 * @property {LivecrawlOptions} [livecrawl] - Options for livecrawling contents. Default is "never" for neural/auto search, "fallback" for keyword search.
 * @property {number} [livecrawlTimeout] - The timeout for livecrawling. Max and default is 10000ms.
 * @property {boolean} [filterEmptyResults] - If true, filters out results with no contents. Default is true.
 * @property {number} [subpages] - The number of subpages to return for each result, where each subpage is derived from an internal link for the result.
 * @property {string | string[]} [subpageTarget] - Text used to match/rank subpages in the returned subpage list. You could use "about" to get *about* page for websites. Note that this is a fuzzy matcher.
 * @property {ExtrasOptions} [extras] - Miscelleneous data derived from results
 */
export type ContentsOptions = {
  text?: TextContentsOptions | true;
  highlights?: HighlightsContentsOptions | true;
  summary?: SummaryContentsOptions | true;
  livecrawl?: LivecrawlOptions;
  context?: ContextOptions | true;
  livecrawlTimeout?: number;
  filterEmptyResults?: boolean;
  subpages?: number;
  subpageTarget?: string | string[];
  extras?: ExtrasOptions;
};

/**
 * Options for performing a search query
 * @typedef {Object} SearchOptions
 * @property {ContentsOptions | boolean} [contents] - Options for retrieving page contents for each result returned. Default is { text: { maxCharacters: 10_000 } }.
 * @property {number} [numResults] - Number of search results to return. Default 10. Max 10 for basic plans. For deep search, recommend leaving blank - number of results will be determined dynamically for your query.
 * @property {string[]} [includeDomains] - List of domains to include in the search.
 * @property {string[]} [excludeDomains] - List of domains to exclude in the search.
 * @property {string} [startCrawlDate] - Start date for results based on crawl date.
 * @property {string} [endCrawlDate] - End date for results based on crawl date.
 * @property {string} [startPublishedDate] - Start date for results based on published date.
 * @property {string} [endPublishedDate] - End date for results based on published date.
 * @property {string} [category] - A data category to focus on, with higher comprehensivity and data cleanliness.
 * @property {string[]} [includeText] - List of strings that must be present in webpage text of results. Currently only supports 1 string of up to 5 words.
 * @property {string[]} [excludeText] - List of strings that must not be present in webpage text of results. Currently only supports 1 string of up to 5 words.
 * @property {string[]} [flags] - Experimental flags
 * @property {string} [userLocation] - The two-letter ISO country code of the user, e.g. US.
 */
export type BaseSearchOptions = {
  contents?: ContentsOptions;
  numResults?: number;
  includeDomains?: string[];
  excludeDomains?: string[];
  startCrawlDate?: string;
  endCrawlDate?: string;
  startPublishedDate?: string;
  endPublishedDate?: string;
  category?:
    | "company"
    | "research paper"
    | "news"
    | "pdf"
    | "github"
    | "tweet"
    | "personal site"
    | "financial report"
    | "people";
  includeText?: string[];
  excludeText?: string[];
  flags?: string[];
  userLocation?: string;
};

/**
 * Base search options shared across all search types
 */
type BaseRegularSearchOptions = BaseSearchOptions & {
  /**
   * If true, the search results are moderated for safety.
   */
  moderation?: boolean;
  useAutoprompt?: boolean;
};

/**
 * Contents options for deep search - context is always returned and cannot be disabled
 */
type DeepContentsOptions = Omit<ContentsOptions, "context"> & {
  context?: Omit<ContextOptions, never> | true;
};

/**
 * Search options for deep search type, which supports additional queries.
 * Note: context is always returned by the API for deep search and cannot be set to false.
 */
type DeepSearchOptions = Omit<BaseRegularSearchOptions, "contents"> & {
  type: "deep";
  /**
   * Alternative query formulations for deep search to skip automatic LLM-based query expansion.
   * Max 5 queries.
   * @example ["machine learning", "ML algorithms", "neural networks"]
   */
  additionalQueries?: string[];
  /**
   * Options for retrieving page contents. For deep search, context is always returned.
   */
  contents?: DeepContentsOptions;
};

/**
 * Search options for non-deep search types (keyword, neural, auto, hybrid, fast)
 */
type NonDeepSearchOptions = BaseRegularSearchOptions & {
  type?: "keyword" | "neural" | "auto" | "hybrid" | "fast";
};

/**
 * Search options for performing a search query.
 * Uses a discriminated union to ensure additionalQueries is only allowed when type is "deep".
 */
export type RegularSearchOptions = DeepSearchOptions | NonDeepSearchOptions;

/**
 * Options for finding similar links.
 * @typedef {Object} FindSimilarOptions
 * @property {boolean} [excludeSourceDomain] - If true, excludes links from the base domain of the input.
 */
export type FindSimilarOptions = BaseSearchOptions & {
  excludeSourceDomain?: boolean;
};

export type ExtrasOptions = { links?: number; imageLinks?: number };

/**
 * Options for livecrawling contents
 * @typedef {string} LivecrawlOptions
 */
export type LivecrawlOptions =
  | "never"
  | "fallback"
  | "always"
  | "auto"
  | "preferred";

/**
 * Options for retrieving text from page.
 * @typedef {Object} TextContentsOptions
 * @property {number} [maxCharacters] - The maximum number of characters to return.
 * @property {boolean} [includeHtmlTags] - If true, includes HTML tags in the returned text. Default: false
 */
export type TextContentsOptions = {
  maxCharacters?: number;
  includeHtmlTags?: boolean;
};

/**
 * Options for retrieving highlights from page.
 * NOTE: For search type "deep", these options will not be respected. Highlights will be generated with respect
 * to your initial query, and may vary in quantity and length.
 * @typedef {Object} HighlightsContentsOptions
 * @property {string} [query] - The query string to use for highlights search.
 * @property {number} [maxCharacters] - Maximum total characters across all highlights per URL. Characters are distributed across multiple non-contiguous highlights (default 5). If the full page is shorter than maxCharacters, the entire page is returned. Default is 2000.
 * @property {number} [numSentences] - Deprecated: use maxCharacters instead. The number of sentences to return for each highlight.
 * @property {number} [highlightsPerUrl] - Deprecated: use maxCharacters instead. The number of highlights to return for each URL.
 */
export type HighlightsContentsOptions = {
  query?: string;
  maxCharacters?: number;
  /** @deprecated Use maxCharacters instead */
  numSentences?: number;
  /** @deprecated Use maxCharacters instead */
  highlightsPerUrl?: number;
};

/**
 * Options for retrieving summary from page.
 * @typedef {Object} SummaryContentsOptions
 * @property {string} [query] - The query string to use for summary generation.
 * @property {JSONSchema} [schema] - JSON schema for structured output from summary.
 */
export type SummaryContentsOptions = {
  query?: string;
  schema?: Record<string, unknown> | ZodSchema;
};

/**
 * @deprecated Use Record<string, unknown> instead.
 */
export type JSONSchema = Record<string, unknown>;

/**
 * Options for retrieving the context from a list of search results. The context is a string
 * representation of all the search results.
 * @typedef {Object} ContextOptions
 * @property {number} [maxCharacters] - The maximum number of characters.
 */
export type ContextOptions = {
  maxCharacters?: number;
};

/**
 * @typedef {Object} TextResponse
 * @property {string} text - Text from page
 */
export type TextResponse = { text: string };

/**
 * @typedef {Object} HighlightsResponse
 * @property {string[]} highlights - The highlights as an array of strings.
 * @property {number[]} [highlightScores] - The corresponding scores as an array of floats, 0 to 1
 */
export type HighlightsResponse = {
  highlights: string[];
  highlightScores?: number[];
};

/**
 * @typedef {Object} SummaryResponse
 * @property {string} summary - The generated summary of the page content.
 */
export type SummaryResponse = { summary: string };

/**
 * @typedef {Object} ExtrasResponse
 * @property {string[]} links - The links on the page of a result
 * @property {string[]} imageLinks - The image links on the page of a result
 */
export type ExtrasResponse = {
  extras: { links?: string[]; imageLinks?: string[] };
};

/**
 * @typedef {Object} SubpagesResponse
 * @property {ContentsResultComponent<T extends ContentsOptions>} subpages - The subpages for a result
 */
export type SubpagesResponse<T extends ContentsOptions> = {
  subpages: ContentsResultComponent<T>[];
};

export type Default<T extends {}, U> = [keyof T] extends [never] ? U : T;

/**
 * @typedef {Object} ContentsResultComponent
 * Depending on 'ContentsOptions', this yields a combination of 'TextResponse', 'HighlightsResponse', 'SummaryResponse', or an empty object.
 *
 * @template T - A type extending from 'ContentsOptions'.
 */
export type ContentsResultComponent<T extends ContentsOptions> =
  (T["text"] extends object | true ? TextResponse : {}) &
    (T["highlights"] extends object | true ? HighlightsResponse : {}) &
    (T["summary"] extends object | true ? SummaryResponse : {}) &
    (T["subpages"] extends number ? SubpagesResponse<T> : {}) &
    (T["extras"] extends object ? ExtrasResponse : {});

/**
 * Represents the cost breakdown related to contents retrieval. Fields are optional because
 * only non-zero costs are included.
 * @typedef {Object} CostDollarsContents
 * @property {number} [text] - The cost in dollars for retrieving text.
 * @property {number} [highlights] - The cost in dollars for retrieving highlights.
 * @property {number} [summary] - The cost in dollars for retrieving summary.
 */
export type CostDollarsContents = {
  text?: number;
  highlights?: number;
  summary?: number;
};

/**
 * Represents the cost breakdown related to search. Fields are optional because
 * only non-zero costs are included.
 * @typedef {Object} CostDollarsSeearch
 * @property {number} [neural] - The cost in dollars for neural search.
 * @property {number} [keyword] - The cost in dollars for keyword search.
 */
export type CostDollarsSeearch = {
  neural?: number;
  keyword?: number;
};

/**
 * Represents the total cost breakdown. Only non-zero costs are included.
 * @typedef {Object} CostDollars
 * @property {number} total - The total cost in dollars.
 * @property {CostDollarsSeearch} [search] - The cost breakdown for search.
 * @property {CostDollarsContents} [contents] - The cost breakdown for contents.
 */
export type CostDollars = {
  total: number;
  search?: CostDollarsSeearch;
  contents?: CostDollarsContents;
};

/**
 * Entity types for company/people search results.
 * Only returned when using category=company or category=people searches.
 */

/** Company workforce information. */
export type EntityCompanyPropertiesWorkforce = {
  total?: number | null;
};

/** Company headquarters information. */
export type EntityCompanyPropertiesHeadquarters = {
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
  country?: string | null;
};

/** Funding round information. */
export type EntityCompanyPropertiesFundingRound = {
  name?: string | null;
  date?: string | null;
  amount?: number | null;
};

/** Company financial information. */
export type EntityCompanyPropertiesFinancials = {
  revenueAnnual?: number | null;
  fundingTotal?: number | null;
  fundingLatestRound?: EntityCompanyPropertiesFundingRound | null;
};

/** Company web traffic information. */
export type EntityCompanyPropertiesWebTraffic = {
  visitsMonthly?: number | null;
};

/** Structured properties for a company entity. */
export type EntityCompanyProperties = {
  name?: string | null;
  foundedYear?: number | null;
  description?: string | null;
  workforce?: EntityCompanyPropertiesWorkforce | null;
  headquarters?: EntityCompanyPropertiesHeadquarters | null;
  financials?: EntityCompanyPropertiesFinancials | null;
  webTraffic?: EntityCompanyPropertiesWebTraffic | null;
};

/** Date range for work history entries. */
export type EntityDateRange = {
  from?: string | null;
  to?: string | null;
};

/** Reference to a company in work history. */
export type EntityPersonPropertiesCompanyRef = {
  id?: string | null;
  name?: string | null;
};

/** A single work history entry for a person. */
export type EntityPersonPropertiesWorkHistoryEntry = {
  title?: string | null;
  location?: string | null;
  dates?: EntityDateRange | null;
  company?: EntityPersonPropertiesCompanyRef | null;
};

/** Structured properties for a person entity. */
export type EntityPersonProperties = {
  name?: string | null;
  location?: string | null;
  workHistory?: EntityPersonPropertiesWorkHistoryEntry[];
};

/** Structured entity data for a company. */
export type CompanyEntity = {
  id: string;
  type: "company";
  version: number;
  properties: EntityCompanyProperties;
};

/** Structured entity data for a person. */
export type PersonEntity = {
  id: string;
  type: "person";
  version: number;
  properties: EntityPersonProperties;
};

/** Structured entity data for company or person search results. */
export type Entity = CompanyEntity | PersonEntity;

/**
 * Represents a search result object.
 * @typedef {Object} SearchResult
 * @property {string} title - The title of the search result.
 * @property {string} url - The URL of the search result.
 * @property {string} [publishedDate] - The estimated creation date of the content.
 * @property {string} [author] - The author of the content, if available.
 * @property {number} [score] - Similarity score between the query/url and the result.
 * @property {string} id - The temporary ID for the document.
 * @property {string} [image] - A representative image for the content, if any.
 * @property {string} [favicon] - A favicon for the site, if any.
 * @property {Entity[]} [entities] - Structured entity data for company or person search results.
 */
export type SearchResult<T extends ContentsOptions> = {
  title: string | null;
  url: string;
  publishedDate?: string;
  author?: string;
  score?: number;
  id: string;
  image?: string;
  favicon?: string;
  entities?: Entity[];
} & ContentsResultComponent<T>;

/**
 * Represents a search response object.
 * @typedef {Object} SearchResponse
 * @property {Result[]} results - The list of search results.
 * @property {string} [context] - The context for the search.
 * @property {string} [autoDate] - The autoprompt date, if applicable.
 * @property {string} requestId - The request ID for the search.
 * @property {CostDollars} [costDollars] - The cost breakdown for this request.
 */
export type SearchResponse<T extends ContentsOptions> = {
  results: SearchResult<T>[];
  context?: string;
  autoDate?: string;
  requestId: string;
  statuses?: Array<Status>;
  costDollars?: CostDollars;
};

export type Status = {
  id: string;
  status: string;
  source: string;
};

/**
 * Options for the answer endpoint
 * @typedef {Object} AnswerOptions
 * @property {boolean} [stream] - Whether to stream the response. Default false.
 * @property {boolean} [text] - Whether to include text in the source results. Default false.
 * @property {"exa"} [model] - The model to use for generating the answer. Default "exa".
 * @property {string} [systemPrompt] - A system prompt to guide the LLM's behavior when generating the answer.
 * @property {Object} [outputSchema] - A JSON Schema specification for the structure you expect the output to take
 */
export type AnswerOptions = {
  stream?: boolean;
  text?: boolean;
  model?: "exa";
  systemPrompt?: string;
  outputSchema?: Record<string, unknown>;
  userLocation?: string;
};

/**
 * Represents an answer response object from the /answer endpoint.
 * @typedef {Object} AnswerResponse
 * @property {string | Object} answer - The generated answer text (or an object matching `outputSchema`, if provided)
 * @property {SearchResult<{}>[]} citations - The sources used to generate the answer.
 * @property {CostDollars} [costDollars] - The cost breakdown for this request.
 * @property {string} [requestId] - Optional request ID for the answer.
 */
export type AnswerResponse = {
  answer: string | Record<string, unknown>;
  citations: SearchResult<{}>[];
  requestId?: string;
  costDollars?: CostDollars;
};

export type AnswerStreamChunk = {
  /**
   * The partial text content of the answer (if present in this chunk).
   */
  content?: string;
  /**
   * Citations associated with the current chunk of text (if present).
   */
  citations?: Array<{
    id: string;
    url: string;
    title?: string;
    publishedDate?: string;
    author?: string;
    text?: string;
  }>;
};

/**
 * Represents a streaming answer response chunk from the /answer endpoint.
 * @typedef {Object} AnswerStreamResponse
 * @property {string} [answer] - A chunk of the generated answer text.
 * @property {SearchResult<{}>[]]} [citations] - The sources used to generate the answer.
 */
export type AnswerStreamResponse = {
  answer?: string;
  citations?: SearchResult<{}>[];
};

// ==========================================
// Zod-Enhanced Types
// ==========================================

/**
 * Enhanced answer options that accepts either JSON schema or Zod schema
 */
export type AnswerOptionsTyped<T> = Omit<AnswerOptions, "outputSchema"> & {
  outputSchema: T;
};

/**
 * Enhanced answer response with strongly typed answer when using Zod
 */
export type AnswerResponseTyped<T> = Omit<AnswerResponse, "answer"> & {
  answer: T;
};

/**
 * Enhanced summary contents options that accepts either JSON schema or Zod schema
 */
export type SummaryContentsOptionsTyped<T> = Omit<
  SummaryContentsOptions,
  "schema"
> & {
  schema: T;
};

/**
 * The Exa class encapsulates the API's endpoints.
 */
export class Exa {
  private baseURL: string;
  private headers: Headers;

  /**
   * Websets API client
   */
  websets: WebsetsClient;

  /**
   * Research API client
   */
  research: ResearchClient;

  /**
   * Helper method to separate out the contents-specific options from the rest.
   */
  private extractContentsOptions<T extends ContentsOptions>(
    options: T
  ): {
    contentsOptions: ContentsOptions;
    restOptions: Omit<T, keyof ContentsOptions>;
  } {
    const {
      text,
      highlights,
      summary,
      subpages,
      subpageTarget,
      extras,
      livecrawl,
      livecrawlTimeout,
      context,
      ...rest
    } = options;

    const contentsOptions: ContentsOptions = {};

    // Default: if none of text, summary, or highlights is provided, we retrieve text
    if (
      text === undefined &&
      summary === undefined &&
      highlights === undefined &&
      extras === undefined
    ) {
      contentsOptions.text = true;
    }

    if (text !== undefined) contentsOptions.text = text;
    if (highlights !== undefined) contentsOptions.highlights = highlights;
    if (summary !== undefined) {
      // Handle zod schema conversion for summary
      if (
        typeof summary === "object" &&
        summary !== null &&
        "schema" in summary &&
        summary.schema &&
        isZodSchema(summary.schema)
      ) {
        contentsOptions.summary = {
          ...summary,
          schema: zodToJsonSchema(summary.schema),
        };
      } else {
        contentsOptions.summary = summary;
      }
    }
    if (subpages !== undefined) contentsOptions.subpages = subpages;
    if (subpageTarget !== undefined)
      contentsOptions.subpageTarget = subpageTarget;
    if (extras !== undefined) contentsOptions.extras = extras;
    if (livecrawl !== undefined) contentsOptions.livecrawl = livecrawl;
    if (livecrawlTimeout !== undefined)
      contentsOptions.livecrawlTimeout = livecrawlTimeout;
    if (context !== undefined) contentsOptions.context = context;

    return {
      contentsOptions,
      restOptions: rest as Omit<T, keyof ContentsOptions>,
    };
  }

  /**
   * Constructs the Exa API client.
   * @param {string} apiKey - The API key for authentication.
   * @param {string} [baseURL] - The base URL of the Exa API.
   */
  constructor(apiKey?: string, baseURL: string = "https://api.exa.ai") {
    this.baseURL = baseURL;
    if (!apiKey) {
      apiKey = process.env.EXA_API_KEY;
      if (!apiKey) {
        throw new ExaError(
          "API key must be provided as an argument or as an environment variable (EXA_API_KEY)",
          HttpStatusCode.Unauthorized
        );
      }
    }
    this.headers = new HeadersImpl({
      "x-api-key": apiKey,
      "Content-Type": "application/json",
      "User-Agent": `exa-node ${packageJson.version}`,
    });

    // Initialize the Websets client
    this.websets = new WebsetsClient(this);
    // Initialize the Research client
    this.research = new ResearchClient(this);
  }

  /**
   * Makes a request to the Exa API.
   * @param {string} endpoint - The API endpoint to call.
   * @param {string} method - The HTTP method to use.
   * @param {any} [body] - The request body for POST requests.
   * @param {Record<string, any>} [params] - The query parameters.
   * @returns {Promise<any>} The response from the API.
   * @throws {ExaError} When any API request fails with structured error information
   */
  async request<T = unknown>(
    endpoint: string,
    method: string,
    body?: any,
    params?: Record<string, any>,
    headers?: Record<string, string>
  ): Promise<T> {
    // Build URL with query parameters if provided
    let url = this.baseURL + endpoint;
    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (Array.isArray(value)) {
          for (const item of value) {
            searchParams.append(key, item);
          }
        } else if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      }
      url += `?${searchParams.toString()}`;
    }

    let combinedHeaders: Record<string, string> = {};

    if (this.headers instanceof HeadersImpl) {
      this.headers.forEach((value, key) => {
        combinedHeaders[key] = value;
      });
    } else {
      combinedHeaders = { ...(this.headers as Record<string, string>) };
    }

    if (headers) {
      combinedHeaders = { ...combinedHeaders, ...headers };
    }

    const response = await fetchImpl(url, {
      method,
      headers: combinedHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json();

      if (!errorData.statusCode) {
        errorData.statusCode = response.status;
      }
      if (!errorData.timestamp) {
        errorData.timestamp = new Date().toISOString();
      }
      if (!errorData.path) {
        errorData.path = endpoint;
      }

      // For other APIs, throw a simple ExaError with just message and status
      let message = errorData.error || "Unknown error";
      if (errorData.message) {
        message += (message.length > 0 ? ". " : "") + errorData.message;
      }
      throw new ExaError(
        message,
        response.status,
        errorData.timestamp,
        errorData.path
      );
    }

    // If the server responded with an SSE stream, parse it and return the final payload.
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("text/event-stream")) {
      return (await this.parseSSEStream<T>(response)) as T;
    }

    return (await response.json()) as T;
  }

  async rawRequest(
    endpoint: string,
    method: string = "POST",
    body?: Record<string, unknown>,
    queryParams?: Record<
      string,
      string | number | boolean | string[] | undefined
    >
  ): Promise<Response> {
    let url = this.baseURL + endpoint;

    if (queryParams) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(queryParams)) {
        if (Array.isArray(value)) {
          for (const item of value) {
            searchParams.append(key, String(item));
          }
        } else if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      }
      url += `?${searchParams.toString()}`;
    }

    const response = await fetchImpl(url, {
      method,
      headers: this.headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    return response;
  }

  /**
   * Performs a search with an Exa prompt-engineered query.
   * By default, returns text contents. Use contents: false to opt-out.
   *
   * @param {string} query - The query string.
   * @returns {Promise<SearchResponse<{ text: { maxCharacters: 10_000 } }>>} A list of relevant search results with text contents.
   */
  async search(
    query: string
  ): Promise<SearchResponse<{ text: { maxCharacters: 10_000 } }>>;
  /**
   * Performs a search without contents.
   *
   * @param {string} query - The query string.
   * @param {RegularSearchOptions & { contents: false }} options - Search options with contents explicitly disabled
   * @returns {Promise<SearchResponse<{}>>} A list of relevant search results without contents.
   */
  async search(
    query: string,
    options: RegularSearchOptions & { contents: false | null | undefined }
  ): Promise<SearchResponse<{}>>;
  /**
   * Performs a search with specific contents.
   *
   * @param {string} query - The query string.
   * @param {RegularSearchOptions & { contents: T }} options - Search options with specific contents
   * @returns {Promise<SearchResponse<T>>} A list of relevant search results with requested contents.
   */
  async search<T extends ContentsOptions>(
    query: string,
    options: RegularSearchOptions & { contents: T }
  ): Promise<SearchResponse<T>>;
  /**
   * Performs a search with an Exa prompt-engineered query.
   * When no contents option is specified, returns text contents by default.
   *
   * @param {string} query - The query string.
   * @param {Omit<DeepSearchOptions, 'contents'> | Omit<NonDeepSearchOptions, 'contents'>} options - Search options without contents
   * @returns {Promise<SearchResponse<{ text: true }>>} A list of relevant search results with text contents.
   */
  async search(
    query: string,
    options:
      | Omit<DeepSearchOptions, "contents">
      | Omit<NonDeepSearchOptions, "contents">
  ): Promise<SearchResponse<{ text: true }>>;
  async search<T extends ContentsOptions>(
    query: string,
    options?: RegularSearchOptions & { contents?: T | false | null | undefined }
  ): Promise<SearchResponse<T | { text: true } | {}>> {
    if (options === undefined || !("contents" in options)) {
      return await this.request("/search", "POST", {
        query,
        ...options,
        contents: { text: { maxCharacters: DEFAULT_MAX_CHARACTERS } },
      });
    }

    // If contents is false, null, or undefined, don't send it to the API
    if (
      options.contents === false ||
      options.contents === null ||
      options.contents === undefined
    ) {
      const { contents, ...restOptions } = options;
      return await this.request("/search", "POST", { query, ...restOptions });
    }

    return await this.request("/search", "POST", { query, ...options });
  }

  /**
   * @deprecated Use `search()` instead. The search method now returns text contents by default.
   *
   * Migration examples:
   * - `searchAndContents(query)` → `search(query)`
   * - `searchAndContents(query, { text: true })` → `search(query, { contents: { text: true } })`
   * - `searchAndContents(query, { summary: true })` → `search(query, { contents: { summary: true } })`
   *
   * Performs a search with an Exa prompt-engineered query and returns the contents of the documents.
   *
   * @param {string} query - The query string.
   * @param {RegularSearchOptions & T} [options] - Additional search + contents options
   * @returns {Promise<SearchResponse<T>>} A list of relevant search results with requested contents.
   */
  async searchAndContents<T extends ContentsOptions>(
    query: string,
    options?: RegularSearchOptions & T
  ): Promise<SearchResponse<T>> {
    const { contentsOptions, restOptions } =
      options === undefined
        ? {
            contentsOptions: {
              text: { maxCharacters: DEFAULT_MAX_CHARACTERS },
            },
            restOptions: {},
          }
        : this.extractContentsOptions(options);

    return await this.request("/search", "POST", {
      query,
      contents: contentsOptions,
      ...restOptions,
    });
  }

  /**
   * Finds similar links to the provided URL.
   * By default, returns text contents. Use contents: false to opt-out.
   *
   * @param {string} url - The URL for which to find similar links.
   * @returns {Promise<SearchResponse<{ text: { maxCharacters: 10_000 } }>>} A list of similar search results with text contents.
   */
  async findSimilar(
    url: string
  ): Promise<SearchResponse<{ text: { maxCharacters: 10_000 } }>>;
  /**
   * Finds similar links to the provided URL without contents.
   *
   * @param {string} url - The URL for which to find similar links.
   * @param {FindSimilarOptions & { contents: false }} options - Options with contents explicitly disabled
   * @returns {Promise<SearchResponse<{}>>} A list of similar search results without contents.
   */
  async findSimilar(
    url: string,
    options: FindSimilarOptions & { contents: false | null | undefined }
  ): Promise<SearchResponse<{}>>;
  /**
   * Finds similar links to the provided URL with specific contents.
   *
   * @param {string} url - The URL for which to find similar links.
   * @param {FindSimilarOptions & { contents: T }} options - Options with specific contents
   * @returns {Promise<SearchResponse<T>>} A list of similar search results with requested contents.
   */
  async findSimilar<T extends ContentsOptions>(
    url: string,
    options: FindSimilarOptions & { contents: T }
  ): Promise<SearchResponse<T>>;
  /**
   * Finds similar links to the provided URL.
   * When no contents option is specified, returns text contents by default.
   *
   * @param {string} url - The URL for which to find similar links.
   * @param {Omit<FindSimilarOptions, 'contents'>} options - Options without contents
   * @returns {Promise<SearchResponse<{ text: true }>>} A list of similar search results with text contents.
   */
  async findSimilar(
    url: string,
    options: Omit<FindSimilarOptions, "contents">
  ): Promise<SearchResponse<{ text: true }>>;
  async findSimilar<T extends ContentsOptions>(
    url: string,
    options?: FindSimilarOptions & { contents?: T | false | null | undefined }
  ): Promise<SearchResponse<T | { text: { maxCharacters: 10_000 } } | {}>> {
    if (options === undefined || !("contents" in options)) {
      // No options or no contents property → default to text contents
      return await this.request("/findSimilar", "POST", {
        url,
        ...options,
        contents: { text: { maxCharacters: DEFAULT_MAX_CHARACTERS } },
      });
    }

    // If contents is false, null, or undefined, don't send it to the API
    if (
      options.contents === false ||
      options.contents === null ||
      options.contents === undefined
    ) {
      const { contents, ...restOptions } = options;
      return await this.request("/findSimilar", "POST", {
        url,
        ...restOptions,
      });
    }

    // Contents property exists with value - pass it through
    return await this.request("/findSimilar", "POST", { url, ...options });
  }

  /**
   * @deprecated Use `findSimilar()` instead. The findSimilar method now returns text contents by default.
   *
   * Migration examples:
   * - `findSimilarAndContents(url)` → `findSimilar(url)`
   * - `findSimilarAndContents(url, { text: true })` → `findSimilar(url, { contents: { text: true } })`
   * - `findSimilarAndContents(url, { summary: true })` → `findSimilar(url, { contents: { summary: true } })`
   *
   * Finds similar links to the provided URL and returns the contents of the documents.
   * @param {string} url - The URL for which to find similar links.
   * @param {FindSimilarOptions & T} [options] - Additional options for finding similar links + contents.
   * @returns {Promise<SearchResponse<T>>} A list of similar search results, including requested contents.
   */
  async findSimilarAndContents<T extends ContentsOptions>(
    url: string,
    options?: FindSimilarOptions & T
  ): Promise<SearchResponse<T>> {
    const { contentsOptions, restOptions } =
      options === undefined
        ? {
            contentsOptions: {
              text: { maxCharacters: DEFAULT_MAX_CHARACTERS },
            },
            restOptions: {},
          }
        : this.extractContentsOptions(options);

    return await this.request("/findSimilar", "POST", {
      url,
      contents: contentsOptions,
      ...restOptions,
    });
  }

  /**
   * Retrieves contents of documents based on URLs.
   * @param {string | string[] | SearchResult[]} urls - A URL or array of URLs, or an array of SearchResult objects.
   * @param {ContentsOptions} [options] - Additional options for retrieving document contents.
   * @returns {Promise<SearchResponse<T>>} A list of document contents for the requested URLs.
   */
  async getContents<T extends ContentsOptions>(
    urls: string | string[] | SearchResult<T>[],
    options?: T
  ): Promise<SearchResponse<T>> {
    if (!urls || (Array.isArray(urls) && urls.length === 0)) {
      throw new ExaError(
        "Must provide at least one URL",
        HttpStatusCode.BadRequest
      );
    }

    let requestUrls: string[];

    if (typeof urls === "string") {
      requestUrls = [urls];
    } else if (typeof urls[0] === "string") {
      requestUrls = urls as string[];
    } else {
      requestUrls = (urls as SearchResult<T>[]).map((result) => result.url);
    }

    const payload = {
      urls: requestUrls,
      ...options,
    };

    return await this.request("/contents", "POST", payload);
  }

  /**
   * Generate an answer with Zod schema for strongly typed output
   */
  async answer<T>(
    query: string,
    options: AnswerOptionsTyped<ZodSchema<T>>
  ): Promise<AnswerResponseTyped<T>>;

  /**
   * Generate an answer to a query.
   * @param {string} query - The question or query to answer.
   * @param {AnswerOptions} [options] - Additional options for answer generation.
   * @returns {Promise<AnswerResponse>} The generated answer and source references.
   *
   * Example with systemPrompt:
   * ```ts
   * const answer = await exa.answer("What is quantum computing?", {
   *   text: true,
   *   model: "exa",
   *   systemPrompt: "Answer in a technical manner suitable for experts."
   * });
   * ```
   *
   * Note: For streaming responses, use the `streamAnswer` method:
   * ```ts
   * for await (const chunk of exa.streamAnswer(query)) {
   *   // Handle chunks
   * }
   * ```
   */
  async answer(query: string, options?: AnswerOptions): Promise<AnswerResponse>;

  async answer<T>(
    query: string,
    options?: AnswerOptions | AnswerOptionsTyped<ZodSchema<T>>
  ): Promise<AnswerResponse | AnswerResponseTyped<T>> {
    if (options?.stream) {
      throw new ExaError(
        "For streaming responses, please use streamAnswer() instead:\n\n" +
          "for await (const chunk of exa.streamAnswer(query)) {\n" +
          "  // Handle chunks\n" +
          "}",
        HttpStatusCode.BadRequest
      );
    }

    // For non-streaming requests, make a regular API call
    let outputSchema = options?.outputSchema;

    // Convert Zod schema to JSON schema if needed
    if (outputSchema && isZodSchema(outputSchema)) {
      outputSchema = zodToJsonSchema(outputSchema);
    }

    const requestBody = {
      query,
      stream: false,
      text: options?.text ?? false,
      model: options?.model ?? "exa",
      systemPrompt: options?.systemPrompt,
      outputSchema,
      userLocation: options?.userLocation,
    };

    return await this.request("/answer", "POST", requestBody);
  }

  /**
   * Stream an answer with Zod schema for structured output (non-streaming content)
   * Note: Structured output works only with non-streaming content, not with streaming chunks
   */
  streamAnswer<T>(
    query: string,
    options: {
      text?: boolean;
      model?: "exa" | "exa-pro";
      systemPrompt?: string;
      outputSchema: ZodSchema<T>;
    }
  ): AsyncGenerator<AnswerStreamChunk>;

  /**
   * Stream an answer as an async generator
   *
   * Each iteration yields a chunk with partial text (`content`) or new citations.
   * Use this if you'd like to read the answer incrementally, e.g. in a chat UI.
   *
   * Example usage:
   * ```ts
   * for await (const chunk of exa.streamAnswer("What is quantum computing?", {
   *   text: false,
   *   systemPrompt: "Answer in a concise manner suitable for beginners."
   * })) {
   *   if (chunk.content) process.stdout.write(chunk.content);
   *   if (chunk.citations) {
   *     console.log("\nCitations: ", chunk.citations);
   *   }
   * }
   * ```
   */
  streamAnswer(
    query: string,
    options?: {
      text?: boolean;
      model?: "exa" | "exa-pro";
      systemPrompt?: string;
      outputSchema?: Record<string, unknown>;
    }
  ): AsyncGenerator<AnswerStreamChunk>;

  async *streamAnswer<T>(
    query: string,
    options?: {
      text?: boolean;
      model?: "exa" | "exa-pro";
      systemPrompt?: string;
      outputSchema?: Record<string, unknown> | ZodSchema<T>;
    }
  ): AsyncGenerator<AnswerStreamChunk> {
    // Convert Zod schema to JSON schema if needed
    let outputSchema = options?.outputSchema;
    if (outputSchema && isZodSchema(outputSchema)) {
      outputSchema = zodToJsonSchema(outputSchema);
    }

    // Build the POST body and fetch the streaming response.
    const body = {
      query,
      text: options?.text ?? false,
      stream: true,
      model: options?.model ?? "exa",
      systemPrompt: options?.systemPrompt,
      outputSchema,
    };

    const response = await fetchImpl(this.baseURL + "/answer", {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new ExaError(message, response.status, new Date().toISOString());
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new ExaError(
        "No response body available for streaming.",
        500,
        new Date().toISOString()
      );
    }

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.replace(/^data:\s*/, "").trim();
          if (!jsonStr || jsonStr === "[DONE]") {
            continue;
          }

          let chunkData: any;
          try {
            chunkData = JSON.parse(jsonStr);
          } catch (err) {
            continue;
          }

          const chunk = this.processChunk(chunkData);
          if (chunk.content || chunk.citations) {
            yield chunk;
          }
        }
      }

      if (buffer.startsWith("data: ")) {
        const leftover = buffer.replace(/^data:\s*/, "").trim();
        if (leftover && leftover !== "[DONE]") {
          try {
            const chunkData = JSON.parse(leftover);
            const chunk = this.processChunk(chunkData);
            if (chunk.content || chunk.citations) {
              yield chunk;
            }
          } catch (e) {}
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private processChunk(chunkData: any): AnswerStreamChunk {
    let content: string | undefined;
    let citations:
      | Array<{
          id: string;
          url: string;
          title?: string;
          publishedDate?: string;
          author?: string;
          text?: string;
        }>
      | undefined;

    if (
      chunkData.choices &&
      chunkData.choices[0] &&
      chunkData.choices[0].delta
    ) {
      content = chunkData.choices[0].delta.content;
    }

    if (chunkData.citations && chunkData.citations !== "null") {
      citations = chunkData.citations.map((c: any) => ({
        id: c.id,
        url: c.url,
        title: c.title,
        publishedDate: c.publishedDate,
        author: c.author,
        text: c.text,
      }));
    }

    return { content, citations };
  }

  private async parseSSEStream<T>(response: Response): Promise<T> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new ExaError(
        "No response body available for streaming.",
        500,
        new Date().toISOString()
      );
    }

    const decoder = new TextDecoder();
    let buffer = "";

    return new Promise<T>(async (resolve, reject) => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;

            const jsonStr = line.replace(/^data:\s*/, "").trim();
            if (!jsonStr || jsonStr === "[DONE]") {
              continue;
            }

            let chunk: any;
            try {
              chunk = JSON.parse(jsonStr);
            } catch {
              continue; // Ignore malformed JSON lines
            }

            switch (chunk.tag) {
              case "complete":
                reader.releaseLock();
                resolve(chunk.data as T);
                return;
              case "error": {
                const message = chunk.error?.message || "Unknown error";
                reader.releaseLock();
                reject(
                  new ExaError(
                    message,
                    HttpStatusCode.InternalServerError,
                    new Date().toISOString()
                  )
                );
                return;
              }
              // 'progress' and any other tags are ignored for the blocking variant
              default:
                break;
            }
          }
        }

        // If we exit the loop without receiving a completion event
        reject(
          new ExaError(
            "Stream ended without a completion event.",
            HttpStatusCode.InternalServerError,
            new Date().toISOString()
          )
        );
      } catch (err) {
        reject(err as Error);
      } finally {
        try {
          reader.releaseLock();
        } catch {
          /* ignore */
        }
      }
    });
  }
}

// Re-export Websets related types and enums
export * from "./websets";
// Re-export Research related types and client
export * from "./research";

// Export the main class
export default Exa;

// Re-export errors
export * from "./errors";
