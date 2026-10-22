import fetch, { Headers } from "cross-fetch";
import { ZodSchema } from "zod";
import packageJson from "../package.json";
import { AgentClient, BetaClient } from "./agent/client";
import { headersForBetas } from "./agent/betas";
import {
  exaErrorFromResponse,
  isJsonContentType,
  readJsonBody,
} from "./error-response";
import { ExaError, HttpStatusCode } from "./errors";
import { SearchMonitorsClient } from "./monitors/client";
import {
  isStreamRequestOptions,
  mergeRequestBody,
  mergeRequestHeaders,
  mergeRequestOptions,
  mergeRequestQuery,
  omitRequestOptions,
  pickRequestOptions,
  resolveRequestSignal,
  setClientDefaults,
  streamRequestOptions,
  validateTimeout,
  withClientDefaults,
  withDisposeOnBodySettled,
  type RequestOptions,
  type TransportRequestOptions,
} from "./request-options";
import { ResearchClient } from "./research/client";
import { WebsetsClient } from "./websets/client";
import { isZodSchema, zodToJsonSchema } from "./zod-utils";

import { AnthropicTools } from "./tools/anthropic";
import { OpenAITools } from "./tools/openai";
import {
  createGetContentsTool,
  createWebSearchTool,
  ToolRegistry,
  type ToolNamespace,
} from "./tools/core";

// Use native fetch in Node.js environments
const fetchImpl =
  typeof global !== "undefined" && global.fetch ? global.fetch : fetch;
const HeadersImpl =
  typeof global !== "undefined" && global.Headers ? global.Headers : Headers;

const DEFAULT_MAX_CHARACTERS = 10_000;

/** Exa-Beta token required for Dynamic Highlights (research preview). */
export const DYNAMIC_HIGHLIGHTS_BETA = "dynamic-highlights-2026-08-28";

/**
 * Options for retrieving page contents
 * @typedef {Object} ContentsOptions
 * @property {TextContentsOptions | boolean} [text] - Options for retrieving text contents.
 * @property {HighlightsContentsOptions | boolean} [highlights] - Recommended: `true`. Exa dynamically chooses the number of characters based on each document's relevance to your query.
 * @property {SummaryContentsOptions | boolean} [summary] - Options for retrieving summary.
 * @property {ContextOptions | boolean} [context] - Deprecated. Use `text` or `highlights`.
 * @property {number} [maxAgeHours] - Maximum age of cached content in hours. If content is older, it will be fetched fresh. Special values: 0 = always fetch fresh content, -1 = never fetch fresh (use cached content only). Example: 168 = fetch fresh for pages older than 7 days.
 * @property {string} [snapshotAsOf] - ISO 8601 datetime. Return the newest stored version at or before this instant instead of live content.
 * @property {boolean} [filterEmptyResults] - If true, filters out results with no contents. Default is true.
 * @property {number} [subpages] - The number of subpages to return for each result, where each subpage is derived from an internal link for the result. Deprecated on `search()`; use `getContents()` to crawl subpages.
 * @property {string | string[]} [subpageTarget] - Text used to match/rank subpages in the returned subpage list. You could use "about" to get *about* page for websites. Note that this is a fuzzy matcher. Deprecated on `search()`; use `getContents()` to crawl subpages.
 * @property {ExtrasOptions} [extras] - Miscelleneous data derived from results
 */
export type ContentsOptions = {
  text?: TextContentsOptions | true;
  /**
   * Recommended default: `true`. Exa dynamically chooses the number of
   * characters based on each document's relevance to your query.
   * Use this for concise AI context, RAG, and search previews without
   * choosing a character budget yourself. Read `result.highlights`.
   * Set `maxCharacters` only when your application has an explicit
   * character-limit requirement; it overrides the recommended default.
   */
  highlights?: HighlightsContentsOptions | true;
  summary?: SummaryContentsOptions | true;
  livecrawl?: LivecrawlOptions;
  /**
   * @deprecated Use `text` or `highlights` instead.
   */
  context?: ContextOptions | true;
  livecrawlTimeout?: number;
  maxAgeHours?: number;
  snapshotAsOf?: string;
  filterEmptyResults?: boolean;
  subpages?: number;
  subpageTarget?: string | string[];
  extras?: ExtrasOptions;
};

/**
 * Contents options for search requests: `ContentsOptions`, with subpage
 * crawling deprecated. To crawl subpages, pass the result URLs to
 * `getContents()` with `subpages`.
 */
type SearchContentsOptions = Omit<
  ContentsOptions,
  "subpages" | "subpageTarget"
> & {
  /**
   * DEPRECATED: Subpage crawling on search is deprecated. Use `getContents()` with `subpages` instead.
   * @deprecated Use `getContents()` with `subpages` instead.
   */
  subpages?: number;
  /**
   * DEPRECATED: Subpage crawling on search is deprecated. Use `getContents()` with `subpageTarget` instead.
   * @deprecated Use `getContents()` with `subpageTarget` instead.
   */
  subpageTarget?: string | string[];
};

export type { RequestOptions, TransportRequestOptions };

/**
 * The end user's location, as a two-letter ISO 3166-1 country code (e.g.
 * `"US"`) or an object with `country`, a `latitude` and `longitude` pair, or
 * both. `latitude` (-90 to 90) and `longitude` (-180 to 180) are in decimal
 * degrees.
 *
 * The country localizes results. Coordinates are used only for queries that
 * name no place but depend on where the user is, such as "coffee near me".
 * They do not set a country, so send `country` with them to localize results.
 * Send only the precision your use case needs.
 */
export type UserLocation =
  | string
  | { country: string; latitude?: never; longitude?: never }
  | { country?: string; latitude: number; longitude: number };

/**
 * Options that attribute a request to one end user of your application.
 * @typedef {Object} UserIdentifierOptions
 * @property {string} [userIdentifier] - An opaque ID you assign to the end user the request is made for. See {@link UserIdentifierOptions}.
 */
export type UserIdentifierOptions = {
  /**
   * An opaque ID you assign to the end user this request is made for, such
   * as a UUID, used to attribute usage to that end user. Must not contain
   * personal information such as an email address, phone number, username or
   * name. Hash such values before sending them. 1 to 64 characters: letters,
   * digits, `_` and `-`. Retained even when your team has Zero Data
   * Retention enabled. Does not affect results.
   */
  userIdentifier?: string;
};

/**
 * The request a warning is about, passed to a `warnings` handler with each
 * warning.
 */
export type ApiWarningContext = {
  /** API path the request was sent to, such as `/search`. */
  endpoint: string;
  /** HTTP method of the request, in upper case, such as `POST`. */
  method: string;
  /** The request's id, when the response carried one. */
  requestId?: string;
};

/**
 * What an `Exa` client does with the warnings the API returns about a request,
 * such as a field it ignores.
 * - `"log"` (default): print each warning with `console.warn`, once per process
 *   for each endpoint, code and path, as
 *   `[exa] POST /search IGNORED_FIELD at /startCrawlDate: ...`.
 * - `"silent"`: print nothing.
 * - A function: called with every warning of every response, and the request
 *   it is about, instead of printing. For example, to route warnings to your
 *   own logger.
 *
 * The client reports the warnings of every endpoint that returns them. Today
 * that is `/search`, including `streamSearch`. A response keeps its own
 * `warnings` in every mode.
 */
export type WarningsOption =
  | "log"
  | "silent"
  | ((warning: ApiWarning, context: ApiWarningContext) => void);

/**
 * Client-wide settings, given as the third argument of the `Exa` constructor.
 */
export type ExaClientOptions = {
  /**
   * Default timeout in milliseconds for every request this client makes. A
   * per-call `timeout` overrides it. Unset by default, in which case the SDK
   * imposes no timeout of its own.
   */
  timeout?: number | undefined;
  /**
   * What the client does with the warnings the API returns about a request.
   * Defaults to `"log"`: each warning is printed once per process for each
   * endpoint, code and path. See {@link WarningsOption}.
   */
  warnings?: WarningsOption | undefined;
};

/** Receives each warning with the request it is about. */
type WarningHandler = (warning: ApiWarning, context: ApiWarningContext) => void;

/** `METHOD endpoint code path` of each warning the `"log"` mode printed in this process. */
const loggedWarnings = new Set<string>();

/** Prints a warning with `console.warn`, once per process for each endpoint, code and path. */
function logWarningOnce(warning: ApiWarning, context: ApiWarningContext): void {
  const request = `${context.method} ${context.endpoint}`;
  const key = `${request} ${warning.code} ${warning.path}`;
  if (loggedWarnings.has(key)) {
    return;
  }
  loggedWarnings.add(key);
  console.warn(
    `[exa] ${request} ${warning.code} at ${warning.path}: ${warning.message}`
  );
}

/**
 * The handler a client gives each warning for its `warnings` option, or
 * undefined for `"silent"`.
 * @throws {TypeError} When the option is not `"log"`, `"silent"` or a function.
 */
function warningHandlerFor(
  option: WarningsOption | undefined
): WarningHandler | undefined {
  if (option === undefined || option === "log") {
    return logWarningOnce;
  }
  if (option === "silent") {
    return undefined;
  }
  if (typeof option === "function") {
    return option;
  }
  throw new TypeError(
    `options.warnings must be "log", "silent" or a function, got ${JSON.stringify(option)}`
  );
}

/**
 * Endpoints whose responses carry a top-level `warnings` array of
 * {@link ApiWarning}s. The client reads `warnings` from these alone, because
 * other endpoints use the name for other shapes: agent monitor refresh events
 * carry `warnings` as strings.
 */
const BODY_WARNING_ENDPOINTS: ReadonlySet<string> = new Set(["/search"]);

/** Whether a value has the string `code`, `path` and `message` of an {@link ApiWarning}. */
function isApiWarning(value: unknown): value is ApiWarning {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const { code, path, message } = value as Record<string, unknown>;
  return (
    typeof code === "string" &&
    typeof path === "string" &&
    typeof message === "string"
  );
}

/** The well-formed warnings in a response body or stream payload from `endpoint`. */
function bodyWarnings(endpoint: string, body: unknown): ApiWarning[] {
  if (
    !BODY_WARNING_ENDPOINTS.has(endpoint) ||
    typeof body !== "object" ||
    body === null
  ) {
    return [];
  }
  const { warnings } = body as { warnings?: unknown };
  return Array.isArray(warnings) ? warnings.filter(isApiWarning) : [];
}

/**
 * Options for performing a search query
 * @typedef {Object} SearchOptions
 * @property {ContentsOptions | boolean} [contents] - Options for retrieving page contents for each result returned. Default is { text: { maxCharacters: 10_000 } }.
 * @property {number} [numResults] - Number of search results to return. Default 10.
 * @property {string[]} [includeDomains] - List of domains to include in the search.
 * @property {string[]} [excludeDomains] - List of domains to exclude in the search.
 * @property {string} [startCrawlDate] - Deprecated and will be removed in a future release. Start date for results based on crawl date.
 * @property {string} [endCrawlDate] - Deprecated and will be removed in a future release. End date for results based on crawl date.
 * @property {string} [startPublishedDate] - Start date for results based on published date.
 * @property {string} [endPublishedDate] - End date for results based on published date.
 * @property {string} [category] - A data category to focus on, with higher comprehensivity and data cleanliness.
 * @property {string[]} [includeText] - List of strings that must be present in webpage text of results. Currently only supports 1 string of up to 5 words.
 * @property {string[]} [excludeText] - List of strings that must not be present in webpage text of results. Currently only supports 1 string of up to 5 words.
 * @property {string[]} [flags] - Experimental flags
 * @property {UserLocation} [userLocation] - The end user's location, as a two-letter ISO 3166-1 country code or an object. See {@link UserLocation}.
 * @property {boolean} [stream] - Whether to stream back OpenAI-style chat completion chunks. Use `streamSearch()` instead of `search({ stream: true })`.
 * @property {AbortSignal} [signal] - AbortSignal to cancel the underlying HTTP request.
 * @property {number} [timeout] - Request timeout in milliseconds.
 */
export type BaseSearchOptions = TransportRequestOptions & {
  contents?: SearchContentsOptions;
  numResults?: number;
  includeDomains?: string[];
  excludeDomains?: string[];
  /** @deprecated Will be removed in a future release. Do not use in new code. */
  startCrawlDate?: string;
  /** @deprecated Will be removed in a future release. Do not use in new code. */
  endCrawlDate?: string;
  startPublishedDate?: string;
  endPublishedDate?: string;
  category?:
    | "company"
    | "publication"
    | "news"
    | "personal site"
    | "financial report"
    | "people";
  includeText?: string[];
  excludeText?: string[];
  flags?: string[];
  userLocation?: UserLocation;
  stream?: boolean;
};

/**
 * Base search options shared across all search types
 */
type BaseRegularSearchOptions = BaseSearchOptions & {
  /**
   * The broader goal this search serves: the task the caller is working on,
   * beyond the query itself. When an agent picks the query as one step of a
   * larger task, pass the goal of that step — which documents should rank
   * first, which should be excluded, and what to pull from them. Up to 4096
   * characters.
   */
  objective?: string;
  /**
   * An opaque ID you assign to the end user this request is made for, such
   * as a UUID, used to attribute usage to that end user. Must not contain
   * personal information such as an email address, phone number, username or
   * name. Hash such values before sending them. 1 to 64 characters: letters,
   * digits, `_` and `-`. Retained even when your team has Zero Data
   * Retention enabled. Does not affect results.
   */
  userIdentifier?: string;
  /**
   * If true, the search results are moderated for safety.
   */
  moderation?: boolean;
  /**
   * @deprecated No longer supported and ignored by the API. Remove it from
   * the request.
   */
  useAutoprompt?: boolean;
  /**
   * Additional instructions that guide both the search process and the final returned synthesis.
   * Use this to prefer certain sources, emphasize novelty, avoid duplicates, or constrain output style.
   */
  systemPrompt?: string;
  /**
   * Output schema for search responses. When provided, the API returns synthesized output in `output`.
   * - `type: "text"` for plain text output (optionally guided by `description`)
   * - `type: "object"` for structured JSON output
   *
   * Note: For object schemas, the API enforces max depth 2 and max 10 total properties.
   */
  outputSchema?: DeepOutputSchema;
};

/**
 * Deep search types. We recommend `"deep"`. `"deep-reasoning"` is a legacy
 * search type that is still accepted. Instead of `"deep-reasoning"`, use
 * `"deep"`, or Exa Agent for long-running research, list building and
 * multi-hop enrichment. Start an Exa Agent run with `exa.agent.runs.create`.
 */
export type DeepSearchType = "deep-lite" | "deep" | "deep-reasoning";

/**
 * Deep search output schema mode for plain text responses.
 */
export type DeepTextOutputSchema = {
  type: "text";
  /**
   * Optional formatting guidance for text output.
   */
  description?: string;
};

/**
 * Deep search output schema mode for structured JSON object responses.
 */
export type DeepObjectOutputSchema = {
  type: "object";
  /**
   * JSON-schema-style properties for the result object.
   */
  properties?: Record<string, unknown>;
  /**
   * Required property names.
   */
  required?: string[];
};

/**
 * Search output schema.
 * - `type: "text"` returns plain text in `output.content` (with optional description guidance).
 * - `type: "object"` returns structured JSON in `output.content`.
 *
 * Note: For object schemas, the API enforces a maximum nesting depth of 2 and a maximum of 10 total properties.
 */
export type DeepOutputSchema = DeepTextOutputSchema | DeepObjectOutputSchema;

/**
 * Contents options for deep search.
 */
type DeepContentsOptions = Omit<SearchContentsOptions, "context"> & {
  /**
   * @deprecated Use `text` or `highlights` instead.
   */
  context?: ContextOptions | true;
};

/**
 * Search options for deep search types, which additionally support additional queries.
 */
type DeepSearchOptions = Omit<BaseRegularSearchOptions, "contents"> & {
  /**
   * The deep search type. We recommend `"deep"`. `"deep-reasoning"` is a
   * legacy search type that is still accepted. Instead of `"deep-reasoning"`,
   * use `"deep"`, or Exa Agent for long-running research, list building and
   * multi-hop enrichment. Start an Exa Agent run with `exa.agent.runs.create`.
   */
  type: DeepSearchType;
  /**
   * Alternative query formulations for deep search variants to skip automatic LLM-based query expansion.
   * Max 5 queries.
   * @example ["machine learning", "ML algorithms", "neural networks"]
   */
  additionalQueries?: string[];
  /**
   * Options for retrieving page contents.
   */
  contents?: DeepContentsOptions;
};

/**
 * Non-deep search types.
 */
type NonDeepSearchType =
  | "keyword"
  | "neural"
  | "auto"
  | "hybrid"
  | "fast"
  | "instant"
  | "lite";

/**
 * Search options for non-deep search types (keyword, neural, auto, hybrid,
 * fast, instant, lite) and for any other search type string.
 */
type NonDeepSearchOptions = BaseRegularSearchOptions & {
  /**
   * The search type. We recommend `"lite"`, `"auto"` (the default) and, for
   * deep search, `"deep"`. `"lite"` (beta) is a low-cost search that supports
   * a reduced set of parameters.
   *
   * `"fast"` and `"instant"` are legacy search types. They are still accepted;
   * for new code, use `"lite"` instead of `"instant"`, and `"lite"` instead of
   * `"fast"`, or `"auto"` when the request needs parameters `"lite"` rejects.
   *
   * Any other string is passed through to the API as given.
   */
  type?: NonDeepSearchType | (string & {});
};

/**
 * Search options for performing a search query.
 * Uses a discriminated union to ensure additionalQueries is only allowed when type is a deep search variant.
 */
export type RegularSearchOptions = DeepSearchOptions | NonDeepSearchOptions;

/**
 * Search options accepted by `streamSearch`: every search type except `lite`, which does not support streaming.
 *
 * `Type` is inferred from the `type` a caller passes, which lets any search
 * type string through except `"lite"`.
 */
type StreamSearchOptions<Type extends string = never> =
  | DeepSearchOptions
  | (Omit<NonDeepSearchOptions, "type"> & {
      type?:
        | Exclude<NonDeepSearchType, "lite">
        | (Type extends "lite" ? never : Type);
    });

/**
 * Options for opting into Exa-Beta features.
 * @typedef {Object} BetaOptions
 * @property {string[]} [betas] - Exa-Beta tokens to send with the request (e.g. `[DYNAMIC_HIGHLIGHTS_BETA]` for Dynamic Highlights).
 */
export type BetaOptions = {
  betas?: string[];
};

/**
 * Options for `findSimilar()`.
 * @deprecated Use `search()` instead. There is no direct replacement for URL-based similarity.
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
 * Verbosity levels for content filtering.
 * - compact: Most concise output, main content only (default)
 * - standard: Balanced content with more detail
 * - full: Complete content including all sections
 */
export type VerbosityOptions = "compact" | "standard" | "full";

/**
 * Section tags for semantic content filtering.
 */
export type SectionTag =
  | "unspecified"
  | "header"
  | "navigation"
  | "banner"
  | "body"
  | "sidebar"
  | "footer"
  | "metadata";

/**
 * Options for retrieving text from page.
 * @typedef {Object} TextContentsOptions
 * @property {number} [maxCharacters] - The maximum number of characters to return.
 * @property {boolean} [includeHtmlTags] - If true, includes HTML tags in the returned text. Default: false
 * @property {VerbosityOptions} [verbosity] - Controls verbosity level of returned content. Default: "compact". Requires maxAgeHours: 0.
 * @property {SectionTag[]} [includeSections] - Only include content from these semantic sections. Requires maxAgeHours: 0.
 * @property {SectionTag[]} [excludeSections] - Exclude content from these semantic sections. Requires maxAgeHours: 0.
 */
export type TextContentsOptions = {
  maxCharacters?: number;
  includeHtmlTags?: boolean;
  verbosity?: VerbosityOptions;
  includeSections?: SectionTag[];
  excludeSections?: SectionTag[];
};

/**
 * Overrides for highlights. Prefer `highlights: true`: Exa dynamically
 * chooses the number of characters based on each document's relevance
 * to your query. A request for concise context does not require setting
 * a fixed character budget.
 * Deep search variants also support these options for returned highlights.
 * @typedef {Object} HighlightsContentsOptions
 * @property {string} [query] - The query string to use for highlights search.
 * @property {number} [maxCharacters] - Explicit character-limit override. Prefer `highlights: true` unless your application requires a specific limit. Not compatible with `dynamic`.
 * @property {boolean} [dynamic] - Enable Dynamic Highlights (research preview): allocates one shared context budget across all results instead of a per-document budget; the model sizes the output itself. Not compatible with `maxCharacters`. Beta: requires passing `betas: [DYNAMIC_HIGHLIGHTS_BETA]` to the request.
 * @property {number} [numSentences] - DEPRECATED: Use maxCharacters instead.
 * @property {number} [highlightsPerUrl] - DEPRECATED: Use maxCharacters instead.
 */
export type HighlightsContentsOptions = {
  query?: string;
  /**
   * Override for an explicit application character limit. Prefer
   * `highlights: true` to let Exa choose the length based on relevance.
   * A general need for concise context does not require a fixed limit.
   */
  maxCharacters?: number;
  dynamic?: boolean;
  /**
   * @deprecated Use `maxCharacters` instead.
   */
  numSentences?: number;
  /**
   * @deprecated Use `maxCharacters` instead.
   */
  highlightsPerUrl?: number;
};
/**
 * Options for retrieving summary from page.
 * @typedef {Object} SummaryContentsOptions
 * @property {string} [query] - The query string to use for summary generation.
 * @property {Record<string, unknown> | ZodSchema} [schema] - JSON schema for structured output from summary.
 */
export type SummaryContentsOptions = {
  query?: string;
  schema?: Record<string, unknown> | ZodSchema;
};

/**
 * @deprecated Use `Record<string, unknown>` instead.
 */
export type JSONSchema = Record<string, unknown>;

/**
 * @deprecated Use `text` or `highlights` instead.
 *
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

/** Reference to an institution in education history. */
export type EntityPersonPropertiesInstitutionRef = {
  id?: string | null;
  name?: string | null;
};

/** A single education history entry for a person. */
export type EntityPersonPropertiesEducationHistoryEntry = {
  degree?: string | null;
  dates?: EntityDateRange | null;
  institution?: EntityPersonPropertiesInstitutionRef | null;
};

/** A notable publication by a person. */
export type EntityPersonPropertiesNotableWork = {
  title?: string | null;
  year?: number | null;
  venue?: string | null;
  citationCount?: number | null;
  doi?: string | null;
  id?: string | null;
  type?: string | null;
};

/** Research information for a person. */
export type EntityPersonPropertiesResearch = {
  worksCount?: number | null;
  citationCount?: number | null;
  hIndex?: number | null;
  firstPublicationYear?: number | null;
  latestPublicationYear?: number | null;
  areas?: string[];
  notableWorks?: EntityPersonPropertiesNotableWork[];
};

/** Structured properties for a person entity. */
export type EntityPersonProperties = {
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  location?: string | null;
  workHistory?: EntityPersonPropertiesWorkHistoryEntry[];
  educationHistory?: EntityPersonPropertiesEducationHistoryEntry[];
  research?: EntityPersonPropertiesResearch | null;
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
 * @property {string} [snapshotAt] - Crawl instant of the stored version served for a snapshotAsOf request.
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
  snapshotAt?: string;
  entities?: Entity[];
} & ContentsResultComponent<T>;

export type DeepSearchOutputGroundingCitation = {
  url: string;
  title: string;
};

export type DeepSearchOutputGroundingConfidence = "low" | "medium" | "high";

export type DeepSearchOutputGrounding = {
  field: string;
  citations: DeepSearchOutputGroundingCitation[];
  confidence: DeepSearchOutputGroundingConfidence;
};

export type DeepSearchOutput = {
  content: string | Record<string, unknown>;
  grounding: DeepSearchOutputGrounding[];
};

/**
 * Known `ApiWarning` codes. The set is open, so handle codes you do not know.
 * - `IGNORED_FIELD`: the field at `path` is accepted and has no effect on the request.
 */
export type ApiWarningCode = "IGNORED_FIELD" | (string & {});

/**
 * A warning the API returns about a request, such as a field it ignores. A
 * warning never changes the status code or the result. It is for whoever owns
 * the code that builds the request: fix the request, and do not pass the
 * warning to a model.
 */
export type ApiWarning = {
  /** Machine-readable code in UPPER_SNAKE case, such as `IGNORED_FIELD`. */
  code: ApiWarningCode;
  /** JSON Pointer to the request field the warning is about, such as `/startCrawlDate`. */
  path: string;
  /** What to change in the request, in plain words. */
  message: string;
};

/** Known `SearchWarning` codes: the {@link ApiWarningCode}s. */
export type SearchWarningCode = ApiWarningCode;

/** A warning about a search request: an {@link ApiWarning}. */
export type SearchWarning = ApiWarning;

/**
 * Known `SearchNotice` codes. The set is open, so handle codes you do not know.
 * - `RESTRICTIONS_RELAXED`: no results matched a restriction in the query, such as `site:` or an exact phrase, so the results come from a search with it removed.
 */
export type SearchNoticeCode = "RESTRICTIONS_RELAXED" | (string & {});

/**
 * A note about how the results of a search were produced, such as a query
 * restriction relaxed to return results. A notice is written to be shown to a
 * model. Pass its `message` to the model that reads the results.
 */
export type SearchNotice = {
  /** Machine-readable code in UPPER_SNAKE case, such as `RESTRICTIONS_RELAXED`. */
  code: SearchNoticeCode;
  /** JSON Pointer to the request field the notice is about, such as `/query`. */
  path: string;
  /** Complete on its own and written to be shown to a model. */
  message: string;
  /** Optional extra context. No schema is promised for its keys, and it never carries information that `message` lacks. */
  details?: Record<string, unknown>;
};

/**
 * Represents a search response object.
 * @typedef {Object} SearchResponse
 * @property {Result[]} results - The list of search results.
 * @property {string} [context] - Deprecated. Use `text` or `highlights` on individual results.
 * @property {DeepSearchOutput} [output] - Search synthesized output object returned when `outputSchema` is provided.
 * @property {string} [autoDate] - The autoprompt date, if applicable.
 * @property {string} requestId - The request ID for the search.
 * @property {CostDollars} [costDollars] - The cost breakdown for this request.
 * @property {string} [resolvedSearchType] - The resolved search type ('neural' or 'keyword') when using 'auto' search.
 * @property {number} [searchTime] - Time taken for the search in milliseconds.
 * @property {SearchWarning[]} [warnings] - Notes about the search request, such as a field the API ignores. Absent when there are none.
 * @property {SearchNotice[]} [notices] - Notes about how the results were produced, written to be shown to a model. Absent when there are none.
 */
export type SearchResponse<T extends ContentsOptions> = {
  results: SearchResult<T>[];
  /**
   * @deprecated Use `text` or `highlights` on individual results instead.
   */
  context?: string;
  output?: DeepSearchOutput;
  autoDate?: string;
  requestId: string;
  statuses?: Array<Status>;
  costDollars?: CostDollars;
  resolvedSearchType?: string;
  searchTime?: number;
  /**
   * Notes about the search request, such as a field the API ignores. Returned
   * by `search` only, and absent when there are none.
   */
  warnings?: SearchWarning[];
  /**
   * Notes about how the results were produced, such as a query restriction
   * relaxed to return results. Written to be shown to a model. Returned by
   * `search` only, and absent when there are none.
   */
  notices?: SearchNotice[];
};

/** Error details for a failed content retrieval. */
export type ContentStatusError = {
  tag?: string;
  httpStatusCode?: number | null;
};

/** Status information for a requested URL. */
export type Status = {
  id: string;
  status: string;
  source?: string;
  error?: ContentStatusError | null;
};

/**
 * Options for the answer endpoint
 * @typedef {Object} AnswerOptions
 * @property {boolean} [stream] - Whether to stream the response. Default false.
 * @property {boolean} [text] - Whether to include text in the source results. Default false.
 * @property {"exa"} [model] - The model to use for generating the answer. Default "exa".
 * @property {string} [systemPrompt] - A system prompt to guide the LLM's behavior when generating the answer.
 * @property {Object} [outputSchema] - A JSON Schema specification for the structure you expect the output to take
 * @property {UserLocation} [userLocation] - The end user's location, as a two-letter ISO 3166-1 country code or an object. See {@link UserLocation}.
 * @property {string} [userIdentifier] - An opaque ID you assign to the end user the request is made for. See {@link UserIdentifierOptions}.
 * @property {AbortSignal} [signal] - AbortSignal to cancel the underlying HTTP request.
 * @property {number} [timeout] - Request timeout in milliseconds.
 */
export type AnswerOptions = UserIdentifierOptions & TransportRequestOptions & {
  stream?: boolean;
  text?: boolean;
  model?: "exa";
  systemPrompt?: string;
  outputSchema?: Record<string, unknown>;
  userLocation?: UserLocation;
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
 * One chunk of a `streamSearch` response, with partial text (`content`), new
 * citations, or the request's `warnings`.
 */
export type SearchStreamChunk = AnswerStreamChunk & {
  /**
   * Notes about the search request, such as a field the API ignores. When the
   * API returns any, they arrive on one chunk of their own, after the streamed
   * text.
   */
  warnings?: SearchWarning[];
};

/** One entry of a stream chunk's `citations`. */
type StreamCitation = NonNullable<AnswerStreamChunk["citations"]>[number];

/**
 * The `results` of a search response as stream citations, with the fields a
 * citation has. Returns undefined when there are no results.
 */
function citationsFromResults(results: unknown): StreamCitation[] | undefined {
  if (!Array.isArray(results)) {
    return undefined;
  }
  const citations = results
    .filter((result) => typeof result === "object" && result !== null)
    .map((result) => ({
      id: result.id,
      url: result.url,
      title: result.title ?? undefined,
      publishedDate: result.publishedDate ?? undefined,
      author: result.author ?? undefined,
      text: result.text ?? undefined,
    }));
  return citations.length > 0 ? citations : undefined;
}

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
 * Returns contents options with a Zod `summary.schema` converted to JSON Schema,
 * the form the API accepts. Any other value is returned unchanged.
 */
function withJsonSummarySchema<T>(contents: T): T {
  if (typeof contents !== "object" || contents === null) return contents;
  const summary: unknown = (contents as { summary?: unknown }).summary;
  if (typeof summary !== "object" || summary === null) return contents;
  const schema: unknown = (summary as { schema?: unknown }).schema;
  if (!isZodSchema(schema)) return contents;
  return {
    ...contents,
    summary: { ...summary, schema: zodToJsonSchema(schema) },
  };
}

/**
 * The Exa class encapsulates the API's endpoints.
 */
export class Exa {
  private baseURL: string;
  private headers: Headers;
  /** Client-wide transport defaults; a per-call option overrides each field. */

  /**
   * Websets API client
   */
  websets: WebsetsClient;

  /**
   * Research API client
   */
  research: ResearchClient;

  /**
   * Search Monitors API client
   */
  monitors: SearchMonitorsClient;

  /**
   * Agent API client
   */
  agent: AgentClient;

  /**
   * Beta API clients
   */
  beta: BetaClient;

  /** Provider-neutral Exa tools. */
  tools: ToolNamespace;

  /** OpenAI Chat Completions and Responses API tools. */
  openai: OpenAITools;

  /** Anthropic Messages API tools. */
  anthropic: AnthropicTools;

  private readonly toolRegistry = new ToolRegistry();
  /** Receives each warning the API returns; undefined when `warnings` is `"silent"`. */
  private readonly warningHandler: WarningHandler | undefined;

  /**
   * Hands each warning in a response body or stream payload to the `warnings`
   * option's handler. `request` calls it for every JSON response and
   * `streamChatCompletions` for every stream payload, so every endpoint
   * reports through here.
   */
  private reportWarnings(
    endpoint: string,
    method: string,
    body: unknown,
    requestIdHeader: string | null
  ): void {
    if (!this.warningHandler) {
      return;
    }
    const warnings = bodyWarnings(endpoint, body);
    if (warnings.length === 0) {
      return;
    }
    const bodyRequestId = (body as { requestId?: unknown }).requestId;
    const requestId =
      typeof bodyRequestId === "string"
        ? bodyRequestId
        : (requestIdHeader ?? undefined);
    const context: ApiWarningContext = {
      endpoint,
      method: method.toUpperCase(),
      ...(requestId !== undefined && { requestId }),
    };
    for (const warning of warnings) {
      this.warningHandler(warning, context);
    }
  }

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
      maxAgeHours,
      snapshotAsOf,
      filterEmptyResults,
      // DEPRECATED FIELD: preserve legacy `context` only for backward compatibility.
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
    if (summary !== undefined) contentsOptions.summary = summary;
    if (subpages !== undefined) contentsOptions.subpages = subpages;
    if (subpageTarget !== undefined)
      contentsOptions.subpageTarget = subpageTarget;
    if (extras !== undefined) contentsOptions.extras = extras;
    if (livecrawl !== undefined) contentsOptions.livecrawl = livecrawl;
    if (livecrawlTimeout !== undefined)
      contentsOptions.livecrawlTimeout = livecrawlTimeout;
    if (maxAgeHours !== undefined) contentsOptions.maxAgeHours = maxAgeHours;
    if (snapshotAsOf !== undefined) contentsOptions.snapshotAsOf = snapshotAsOf;
    if (filterEmptyResults !== undefined)
      contentsOptions.filterEmptyResults = filterEmptyResults;
    // DEPRECATED FIELD: pass through only so existing callers do not break.
    if (context !== undefined) contentsOptions.context = context;

    return {
      contentsOptions: withJsonSummarySchema(contentsOptions),
      restOptions: rest as Omit<T, keyof ContentsOptions>,
    };
  }

  private buildSearchRequestBody(
    query: string,
    options?: RegularSearchOptions & {
      contents?: ContentsOptions | false | null | undefined;
    }
  ): Record<string, unknown> {
    const body = { ...omitRequestOptions(options) } as Record<string, unknown>;
    delete body.betas;
    // The method called decides whether the response streams.
    delete body.stream;
    if (options === undefined || !("contents" in options)) {
      body.contents = { text: { maxCharacters: DEFAULT_MAX_CHARACTERS } };
    } else if (
      options.contents === false ||
      options.contents === null ||
      options.contents === undefined
    ) {
      delete body.contents;
    } else {
      body.contents = withJsonSummarySchema(options.contents);
    }
    return { query, ...body };
  }

  /**
   * Constructs the Exa API client.
   * @param {string} apiKey - The API key for authentication.
   * @param {string} [baseURL] - The base URL of the Exa API.
   * @param {ExaClientOptions} [options] - Client-wide settings (`timeout`, `warnings`).
   * @throws {RangeError} When `options.timeout` is not an integer from 1 to 2147483647.
   * @throws {TypeError} When `options.warnings` is not `"log"`, `"silent"` or a function.
   */
  constructor(
    apiKey?: string,
    baseURL: string = "https://api.exa.ai",
    options?: ExaClientOptions
  ) {
    this.baseURL = baseURL;
    this.warningHandler = warningHandlerFor(options?.warnings);
    setClientDefaults(
      this,
      options?.timeout === undefined
        ? undefined
        : { timeout: validateTimeout(options.timeout) }
    );
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
    // Initialize the Search Monitors client
    this.monitors = new SearchMonitorsClient(this);
    // Initialize the Agent client
    this.agent = new AgentClient(this);
    // Initialize beta clients
    this.beta = new BetaClient(this.agent);
    this.tools = {
      webSearch: (options) =>
        createWebSearchTool(this, this.toolRegistry, options),
      getContents: (options) =>
        createGetContentsTool(this, this.toolRegistry, options),
    };
    this.openai = new OpenAITools(this, this.toolRegistry);
    this.anthropic = new AnthropicTools(this, this.toolRegistry);
  }

  /**
   * Makes a request to the Exa API.
   * @param {string} endpoint - The API endpoint to call.
   * @param {string} method - The HTTP method to use.
   * @param {any} [body] - The request body for POST requests.
   * @param {Record<string, any>} [params] - The query parameters.
   * @param {Record<string, string>} [headers] - Additional request headers.
   * @param {RequestOptions} [requestOptions] - Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`).
   * @returns {Promise<any>} The response from the API.
   * @throws {ExaError} When any API request fails with structured error information
   * @throws {ExaTimeoutError} When the request exceeds its `timeout`
   * @throws {ExaAbortError} When the caller's `signal` aborts the request
   */
  async request<T = unknown>(
    endpoint: string,
    method: string,
    body?: any,
    params?: Record<string, any>,
    headers?: Record<string, string>,
    requestOptions?: RequestOptions
  ): Promise<T> {
    body = mergeRequestBody(method, body, requestOptions?.body);
    params = mergeRequestQuery(params, requestOptions?.query);

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
    combinedHeaders = mergeRequestHeaders(
      combinedHeaders,
      requestOptions?.headers
    );

    const { signal, dispose, toRequestError } = resolveRequestSignal(
      withClientDefaults(this, requestOptions)
    );
    try {
      const response = await fetchImpl(url, {
        method,
        headers: combinedHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal,
      });

      if (!response.ok) {
        throw await exaErrorFromResponse(response, endpoint);
      }

      // If the server responded with an SSE stream, parse it and return the final payload.
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("text/event-stream")) {
        return (await this.parseSSEStream<T>(response)) as T;
      }

      const json = await readJsonBody(response, endpoint);

      this.reportWarnings(
        endpoint,
        method,
        json,
        response.headers.get("x-request-id")
      );
      return json as T;
    } catch (error) {
      throw toRequestError(error, endpoint);
    } finally {
      dispose();
    }
  }

  /**
   * Makes a request to the Exa API and returns the raw `Response`.
   *
   * `timeout` keeps running until the response body is consumed or cancelled,
   * and a body read it or the `signal` interrupts rejects with the platform's
   * own error. The SDK's streaming methods instead stop the timeout once the
   * response headers arrive. `body`, `headers` and `query` in
   * `requestOptions` are added to the request as they are in `request`.
   *
   * @throws {ExaTimeoutError} When no response arrives within `timeout`
   * @throws {ExaAbortError} When the caller's `signal` aborts before a response arrives
   */
  async rawRequest(
    endpoint: string,
    method: string = "POST",
    body?: Record<string, unknown>,
    queryParams?: Record<
      string,
      string | number | boolean | string[] | undefined
    >,
    headers?: Record<string, string>,
    requestOptions?: RequestOptions
  ): Promise<Response> {
    body = mergeRequestBody(method, body, requestOptions?.body) as
      | Record<string, unknown>
      | undefined;
    queryParams = mergeRequestQuery(queryParams, requestOptions?.query);

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
    combinedHeaders = mergeRequestHeaders(
      combinedHeaders,
      requestOptions?.headers
    );

    const { signal, dispose, needsDispose, stopTimeout, toRequestError } =
      resolveRequestSignal(withClientDefaults(this, requestOptions));
    try {
      const response = await fetchImpl(url, {
        method,
        headers: combinedHeaders,
        body: body ? JSON.stringify(body) : undefined,
        signal,
      });
      if (isStreamRequestOptions(requestOptions)) {
        const mapError = (error: unknown) => toRequestError(error, endpoint);
        if (!response.ok) {
          // An error response is read whole, not streamed: the timeout stays.
          return withDisposeOnBodySettled(response, dispose, mapError);
        }
        // The stream has started: only the caller's signal may end it now.
        stopTimeout();
        if (!requestOptions?.signal) {
          dispose();
          return response;
        }
        return withDisposeOnBodySettled(response, dispose, mapError);
      }
      if (!needsDispose) {
        return response;
      }
      // Hold signal listeners and the timeout until the body is consumed/cancelled.
      return withDisposeOnBodySettled(response, dispose);
    } catch (error) {
      dispose();
      throw toRequestError(error, endpoint);
    }
  }

  private requestWithOptions<T>(
    endpoint: string,
    method: string,
    body?: any,
    requestOptions?: RequestOptions
  ): Promise<T> {
    const transport = mergeRequestOptions(requestOptions);
    if (transport) {
      return this.request(
        endpoint,
        method,
        body,
        undefined,
        undefined,
        transport
      );
    }
    return this.request(endpoint, method, body);
  }

  private streamRequestWithOptions(
    endpoint: string,
    method: string,
    body?: Record<string, unknown>,
    requestOptions?: RequestOptions
  ): Promise<Response> {
    const transport = streamRequestOptions(this, requestOptions);
    if (transport) {
      return this.rawRequest(
        endpoint,
        method,
        body,
        undefined,
        undefined,
        transport
      );
    }
    return this.rawRequest(endpoint, method, body);
  }

  /**
   * For optimal token efficiency, use
   * `contents: { highlights: true }` and read each result's `highlights` array.
   * Exa dynamically chooses excerpt length based on each document's relevance
   * to your query. Set `maxCharacters` only for an explicit application limit.
   *
   * Supply `objective` to improve search quality and token efficiency.
   * Describe the larger task you're working on and the goal for this search turn.
   * Say which documents should rank first, which should be excluded, and what
   * specific facts or figures to pull from them.
   *
   * Request `text` when you need the full page; use `contents: false` for
   * titles and URLs only. Omitting contents still returns text by default.
   *
   * @param {string} query - The query string.
   * @param {RequestOptions} [requestOptions] - Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`).
   * @returns {Promise<SearchResponse<{ text: { maxCharacters: 10_000 } }>>} A list of relevant search results with text contents.
   */
  async search(
    query: string,
    options?: undefined,
    requestOptions?: RequestOptions
  ): Promise<SearchResponse<{ text: { maxCharacters: 10_000 } }>>;
  /**
   * Performs a search without contents.
   *
   * @param {string} query - The query string.
   * @param {RegularSearchOptions & { contents: false }} options - Search options with contents explicitly disabled
   * @param {RequestOptions} [requestOptions] - Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`).
   * @returns {Promise<SearchResponse<{}>>} A list of relevant search results without contents.
   */
  async search(
    query: string,
    options: RegularSearchOptions &
      BetaOptions & { contents: false | null | undefined },
    requestOptions?: RequestOptions
  ): Promise<SearchResponse<{}>>;
  /**
   * Performs a search with specific contents.
   *
   * @example
   * const response = await exa.search("recent advances in battery recycling", {
   *   contents: { highlights: true },
   *   objective:
   *     "I'm preparing a technical report on battery recycling methods. " +
   *     "For this search turn, gather evidence to compare their economics. " +
   *     "Rank peer-reviewed studies first, exclude marketing pages, and pull " +
   *     "material recovery rates and processing costs.",
   * });
   * for (const result of response.results) {
   *   console.log(result.url, result.highlights);
   * }
   *
   * @param {string} query - The query string.
   * @param {RegularSearchOptions & { contents: T }} options - Search options with specific contents
   * @param {RequestOptions} [requestOptions] - Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`).
   * @returns {Promise<SearchResponse<T>>} A list of relevant search results with requested contents.
   */
  async search<T extends ContentsOptions>(
    query: string,
    options: RegularSearchOptions & BetaOptions & { contents: T },
    requestOptions?: RequestOptions
  ): Promise<SearchResponse<T>>;
  /**
   * When no contents option is specified, returns text contents by default.
   *
   * @param {string} query - The query string.
   * @param {Omit<DeepSearchOptions, 'contents'> | Omit<NonDeepSearchOptions, 'contents'>} options - Search options without contents
   * @param {RequestOptions} [requestOptions] - Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`).
   * @returns {Promise<SearchResponse<{ text: true }>>} A list of relevant search results with text contents.
   */
  async search(
    query: string,
    options: (
      | Omit<DeepSearchOptions, "contents">
      | Omit<NonDeepSearchOptions, "contents">
    ) &
      BetaOptions,
    requestOptions?: RequestOptions
  ): Promise<SearchResponse<{ text: true }>>;
  async search<T extends ContentsOptions>(
    query: string,
    options?: RegularSearchOptions &
      BetaOptions & { contents?: T | false | null | undefined },
    requestOptions?: RequestOptions
  ): Promise<SearchResponse<T | { text: true } | {}>> {
    if (options?.stream) {
      throw new ExaError(
        "For streaming responses, please use streamSearch() instead:\n\n" +
          "for await (const chunk of exa.streamSearch(query)) {\n" +
          "  // Handle chunks\n" +
          "}",
        HttpStatusCode.BadRequest
      );
    }

    const body = this.buildSearchRequestBody(query, options);
    const betaHeaders = headersForBetas(options?.betas);
    const transport = mergeRequestOptions(
      pickRequestOptions(options),
      requestOptions
    );
    if (transport) {
      return await this.request(
        "/search",
        "POST",
        body,
        undefined,
        betaHeaders,
        transport
      );
    }
    return betaHeaders
      ? await this.request("/search", "POST", body, undefined, betaHeaders)
      : await this.request("/search", "POST", body);
  }

  /**
   * Stream a search response as an async generator of OpenAI-style chat completion chunks.
   *
   * Each iteration yields a chunk with partial text (`content`) or new citations.
   * When the API returns `warnings` about the request, one chunk after the text
   * carries them.
   * Use this if you'd like to read synthesized search output incrementally.
   * The `lite` search type does not support streaming.
   *
   * A search without `outputSchema` has no text to stream. Its stream yields
   * one chunk with the results as `citations`, then the warnings chunk when
   * the API returns warnings. Call `search()` for every field of the results.
   * @param {RequestOptions} [requestOptions] - Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`).
   */
  streamSearch<Type extends string = never>(
    query: string,
    options?: StreamSearchOptions<Type> & {
      contents?: ContentsOptions | false | null | undefined;
    },
    requestOptions?: RequestOptions
  ): AsyncGenerator<SearchStreamChunk> {
    return this.streamChatCompletions(
      "/search",
      { ...this.buildSearchRequestBody(query, options), stream: true },
      mergeRequestOptions(pickRequestOptions(options), requestOptions)
    );
  }

  /**
   * @deprecated Use `search()`, which returns text contents by default. Pass
   * content options inside `contents`.
   *
   * Migration examples:
   * - `searchAndContents(query)` → `search(query)`
   * - `searchAndContents(query, { text: true })` → `search(query, { contents: { text: true } })`
   * - `searchAndContents(query, { summary: true })` → `search(query, { contents: { summary: true } })`
   *
   * Compatibility wrapper for the legacy top-level contents options shape.
   *
   * @param {string} query - The query string.
   * @param {RegularSearchOptions & T} [options] - Additional search + contents options
   * @param {RequestOptions} [requestOptions] - Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`).
   * @returns {Promise<SearchResponse<T>>} A list of relevant search results with requested contents.
   */
  async searchAndContents<T extends ContentsOptions>(
    query: string,
    options?: RegularSearchOptions & T,
    requestOptions?: RequestOptions
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

    const body: Record<string, unknown> = {
      query,
      contents: contentsOptions,
      ...omitRequestOptions(restOptions),
    };
    // The method called decides whether the response streams.
    delete body.stream;
    return await this.requestWithOptions(
      "/search",
      "POST",
      body,
      mergeRequestOptions(pickRequestOptions(options), requestOptions)
    );
  }

  /**
   * @deprecated Use `search()` instead. There is no direct replacement for URL-based similarity.
   *
   * Finds similar links to the provided URL.
   * By default, returns text contents. Use contents: false to opt-out.
   *
   * @param {string} url - The URL for which to find similar links.
   * @param {RequestOptions} [requestOptions] - Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`).
   * @returns {Promise<SearchResponse<{ text: { maxCharacters: 10_000 } }>>} A list of similar search results with text contents.
   */
  async findSimilar(
    url: string,
    options?: undefined,
    requestOptions?: RequestOptions
  ): Promise<SearchResponse<{ text: { maxCharacters: 10_000 } }>>;
  /**
   * @deprecated Use `search()` instead. There is no direct replacement for URL-based similarity.
   *
   * Finds similar links to the provided URL without contents.
   *
   * @param {string} url - The URL for which to find similar links.
   * @param {FindSimilarOptions & { contents: false }} options - Options with contents explicitly disabled
   * @param {RequestOptions} [requestOptions] - Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`).
   * @returns {Promise<SearchResponse<{}>>} A list of similar search results without contents.
   */
  async findSimilar(
    url: string,
    options: FindSimilarOptions & { contents: false | null | undefined },
    requestOptions?: RequestOptions
  ): Promise<SearchResponse<{}>>;
  /**
   * @deprecated Use `search()` instead. There is no direct replacement for URL-based similarity.
   *
   * Finds similar links to the provided URL with specific contents.
   *
   * @param {string} url - The URL for which to find similar links.
   * @param {FindSimilarOptions & { contents: T }} options - Options with specific contents
   * @param {RequestOptions} [requestOptions] - Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`).
   * @returns {Promise<SearchResponse<T>>} A list of similar search results with requested contents.
   */
  async findSimilar<T extends ContentsOptions>(
    url: string,
    options: FindSimilarOptions & { contents: T },
    requestOptions?: RequestOptions
  ): Promise<SearchResponse<T>>;
  /**
   * @deprecated Use `search()` instead. There is no direct replacement for URL-based similarity.
   *
   * Finds similar links to the provided URL.
   * When no contents option is specified, returns text contents by default.
   *
   * @param {string} url - The URL for which to find similar links.
   * @param {Omit<FindSimilarOptions, 'contents'>} options - Options without contents
   * @param {RequestOptions} [requestOptions] - Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`).
   * @returns {Promise<SearchResponse<{ text: true }>>} A list of similar search results with text contents.
   */
  async findSimilar(
    url: string,
    options: Omit<FindSimilarOptions, "contents">,
    requestOptions?: RequestOptions
  ): Promise<SearchResponse<{ text: true }>>;
  async findSimilar<T extends ContentsOptions>(
    url: string,
    options?: FindSimilarOptions & { contents?: T | false | null | undefined },
    requestOptions?: RequestOptions
  ): Promise<SearchResponse<T | { text: { maxCharacters: 10_000 } } | {}>> {
    const transport = mergeRequestOptions(
      pickRequestOptions(options),
      requestOptions
    );
    const bodyOptions = omitRequestOptions(options);

    // DEPRECATED METHOD: preserve legacy URL-similarity endpoint for compatibility.
    if (options === undefined || !("contents" in options)) {
      // No options or no contents property → default to text contents
      return await this.requestWithOptions(
        "/findSimilar",
        "POST",
        {
          url,
          ...bodyOptions,
          contents: { text: { maxCharacters: DEFAULT_MAX_CHARACTERS } },
        },
        transport
      );
    }

    // If contents is false, null, or undefined, don't send it to the API
    if (
      options.contents === false ||
      options.contents === null ||
      options.contents === undefined
    ) {
      const { contents: _contents, ...restOptions } = bodyOptions ?? {};
      return await this.requestWithOptions(
        "/findSimilar",
        "POST",
        {
          url,
          ...restOptions,
        },
        transport
      );
    }

    // Contents property exists with value - pass it through
    return await this.requestWithOptions(
      "/findSimilar",
      "POST",
      {
        url,
        ...bodyOptions,
        contents: withJsonSummarySchema(options.contents),
      },
      transport
    );
  }

  /**
   * @deprecated Use `search()` instead. There is no direct replacement for URL-based similarity.
   *
   * Migration examples:
   * - `findSimilarAndContents(url)` → `search(query)`
   * - `findSimilarAndContents(url, { text: true })` → `search(query, { contents: { text: true } })`
   * - `findSimilarAndContents(url, { summary: true })` → `search(query, { contents: { summary: true } })`
   *
   * Compatibility wrapper for the legacy top-level contents options shape.
   * @param {string} url - The URL for which to find similar links.
   * @param {FindSimilarOptions & T} [options] - Additional options for finding similar links + contents.
   * @returns {Promise<SearchResponse<T>>} A list of similar search results, including requested contents.
   */
  async findSimilarAndContents<T extends ContentsOptions>(
    url: string,
    options?: FindSimilarOptions & T,
    requestOptions?: RequestOptions
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

    return await this.requestWithOptions(
      "/findSimilar",
      "POST",
      { url, contents: contentsOptions, ...omitRequestOptions(restOptions) },
      mergeRequestOptions(pickRequestOptions(options), requestOptions)
    );
  }

  /**
   * Retrieves contents of documents based on URLs.
   * @param {string | string[] | SearchResult[]} urls - A URL or array of URLs, or an array of SearchResult objects.
   * @param {ContentsOptions & BetaOptions & UserIdentifierOptions & TransportRequestOptions} [options] - Additional options for retrieving document contents.
   * @param {RequestOptions} [requestOptions] - Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`).
   * @returns {Promise<SearchResponse<T>>} A list of document contents for the requested URLs.
   */
  async getContents<T extends ContentsOptions>(
    urls: string | string[] | SearchResult<T>[],
    options?: T & BetaOptions & UserIdentifierOptions & TransportRequestOptions,
    requestOptions?: RequestOptions
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

    const { betas, ...contentsOptions } = options ?? {};

    const payload = {
      urls: requestUrls,
      ...withJsonSummarySchema(omitRequestOptions(contentsOptions)),
    };

    const betaHeaders = headersForBetas(betas);
    const transport = mergeRequestOptions(
      pickRequestOptions(options),
      requestOptions
    );
    if (transport) {
      return await this.request(
        "/contents",
        "POST",
        payload,
        undefined,
        betaHeaders,
        transport
      );
    }
    return betaHeaders
      ? await this.request("/contents", "POST", payload, undefined, betaHeaders)
      : await this.request("/contents", "POST", payload);
  }

  /**
   * Generate an answer with Zod schema for strongly typed output
   */
  async answer<T>(
    query: string,
    options: AnswerOptionsTyped<ZodSchema<T>>,
    requestOptions?: RequestOptions
  ): Promise<AnswerResponseTyped<T>>;

  /**
   * Generate an answer to a query.
   * @param {string} query - The question or query to answer.
   * @param {AnswerOptions} [options] - Additional options for answer generation.
   * @param {RequestOptions} [requestOptions] - Per-call request options (`signal`, `timeout`, `body`, `headers`, `query`).
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
  async answer(
    query: string,
    options?: AnswerOptions,
    requestOptions?: RequestOptions
  ): Promise<AnswerResponse>;

  async answer<T>(
    query: string,
    options?: AnswerOptions | AnswerOptionsTyped<ZodSchema<T>>,
    requestOptions?: RequestOptions
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
      userIdentifier: options?.userIdentifier,
    };

    return await this.requestWithOptions(
      "/answer",
      "POST",
      requestBody,
      mergeRequestOptions(pickRequestOptions(options), requestOptions)
    );
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
      userLocation?: UserLocation;
    } & UserIdentifierOptions & TransportRequestOptions,
    requestOptions?: RequestOptions
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
      userLocation?: UserLocation;
    } & UserIdentifierOptions & TransportRequestOptions,
    requestOptions?: RequestOptions
  ): AsyncGenerator<AnswerStreamChunk>;

  async *streamAnswer<T>(
    query: string,
    options?: {
      text?: boolean;
      model?: "exa" | "exa-pro";
      systemPrompt?: string;
      outputSchema?: Record<string, unknown> | ZodSchema<T>;
      userLocation?: UserLocation;
    } & UserIdentifierOptions & TransportRequestOptions,
    requestOptions?: RequestOptions
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
      userLocation: options?.userLocation,
      userIdentifier: options?.userIdentifier,
    };

    yield* this.streamChatCompletions(
      "/answer",
      body,
      mergeRequestOptions(pickRequestOptions(options), requestOptions)
    );
  }

  private async *streamChatCompletions(
    endpoint: string,
    body: Record<string, unknown>,
    requestOptions?: RequestOptions
  ): AsyncGenerator<SearchStreamChunk> {
    const response = await this.streamRequestWithOptions(
      endpoint,
      "POST",
      body,
      requestOptions
    );

    if (!response.ok) {
      throw await exaErrorFromResponse(response, endpoint);
    }
    const requestIdHeader = response.headers.get("x-request-id");

    // A response with nothing to stream arrives whole, as JSON. A search
    // without `outputSchema` answers this way.
    if (isJsonContentType(response.headers.get("content-type"))) {
      const payload = await readJsonBody(response, endpoint);
      this.reportWarnings(endpoint, "POST", payload, requestIdHeader);
      yield* this.jsonResponseChunks(payload);
      return;
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
          this.reportWarnings(endpoint, "POST", chunkData, requestIdHeader);
          if (chunk.content || chunk.citations || chunk.warnings) {
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
            this.reportWarnings(endpoint, "POST", chunkData, requestIdHeader);
            if (chunk.content || chunk.citations || chunk.warnings) {
              yield chunk;
            }
          } catch (e) {}
        }
      }
    } finally {
      // Cancel so rawRequest can release signal listeners and timers even if
      // the consumer stops early (break / throw out of the generator).
      try {
        await reader.cancel();
      } catch {
        // ignore
      }
    }
  }

  /**
   * The chunks for a response the API sent whole as JSON instead of streaming
   * it. The first carries its `results` as `citations`. The second is the
   * chunk `processChunk` makes of the whole payload, which carries its
   * `warnings`. A chunk with nothing in it is left out, as in a stream.
   */
  private *jsonResponseChunks(payload: unknown): Generator<SearchStreamChunk> {
    if (typeof payload !== "object" || payload === null) {
      return;
    }
    const citations = citationsFromResults(
      (payload as { results?: unknown }).results
    );
    if (citations) {
      yield { citations };
    }
    const chunk = this.processChunk(payload);
    if (chunk.content || chunk.citations || chunk.warnings) {
      yield chunk;
    }
  }

  /**
   * Parses one stream payload into a chunk. `warnings` is set only when the
   * payload carries a non-empty `warnings` array, which `/search` sends on its
   * `results` event.
   */
  private processChunk(chunkData: any): SearchStreamChunk {
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

    if (Array.isArray(chunkData.warnings) && chunkData.warnings.length > 0) {
      const warnings: SearchWarning[] = chunkData.warnings;
      return { content, citations, warnings };
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
          if (!jsonStr || jsonStr === "[DONE]") continue;

          let chunk: any;
          try {
            chunk = JSON.parse(jsonStr);
          } catch {
            continue;
          }

          if (chunk.tag === "complete") return chunk.data as T;
          if (chunk.tag === "error") {
            throw new ExaError(
              chunk.error?.message || "Unknown error",
              HttpStatusCode.InternalServerError,
              new Date().toISOString()
            );
          }
        }
      }

      throw new ExaError(
        "Stream ended without a completion event.",
        HttpStatusCode.InternalServerError,
        new Date().toISOString()
      );
    } finally {
      // The server may keep the SSE connection open after a terminal event.
      try {
        await reader.cancel();
      } catch {
        // Preserve the completion payload or original read error.
      }
      reader.releaseLock();
    }
  }
}

// Re-export Websets related types and enums
export * from "./websets";
// Re-export Research related types and client
export * from "./research";
// Re-export Search Monitors related types and client
export * from "./monitors";
// Re-export Agent related types and client
export * from "./agent";
export * from "./tools";

// Export the main class
export default Exa;

// Re-export errors
export * from "./errors";
