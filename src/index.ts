import fetch, { Headers } from "cross-fetch";

const isBeta = false;

/**
 * Search options for performing a search query.
 * @typedef {Object} SearchOptions
 * @property {number} [numResults] - Number of search results to return. Default 10. Max 10 for basic plans.
 * @property {string[]} [includeDomains] - List of domains to include in the search.
 * @property {string[]} [excludeDomains] - List of domains to exclude in the search.
 * @property {string} [startCrawlDate] - Start date for results based on crawl date.
 * @property {string} [endCrawlDate] - End date for results based on crawl date.
 * @property {string} [startPublishedDate] - Start date for results based on published date.
 * @property {string} [endPublishedDate] - End date for results based on published date.
 * @property {boolean} [useAutoprompt] - If true, converts query to a Metaphor query.
 * @property {string} [type] - Type of search, 'keyword' or 'neural'.
 * @property {string} [category] - A data category to focus on, with higher comprehensivity and data cleanliness. Currently, the only category is company.
 * @property {string[]} [includeText] - List of strings that must be present in webpage text of results. Currently only supports 1 string of up to 5 words.
 * @property {string[]} [excludeText] - List of strings that must not be present in webpage text of results. Currently only supports 1 string of up to 5 words.
 */
export type BaseSearchOptions = {
  numResults?: number;
  includeDomains?: string[];
  excludeDomains?: string[];
  startCrawlDate?: string;
  endCrawlDate?: string;
  startPublishedDate?: string;
  endPublishedDate?: string;
  category?: string;
  includeText?: string[];
  excludeText?: string[];
};

/**
 * Search options for performing a search query.
 * @typedef {Object} RegularSearchOptions
 */
export type RegularSearchOptions = BaseSearchOptions & {
  useAutoprompt?: boolean;
  type?: string;
};

/**
 * Options for finding similar links.
 * @typedef {Object} FindSimilarOptions
 * @property {number} [numResults] - Number of search results to return. Default 10. Max 10 for basic plans.
 * @property {string[]} [includeDomains] - List of domains to include in the search.
 * @property {string[]} [excludeDomains] - List of domains to exclude from the search.
 * @property {string} [startCrawlDate] - Start date for results based on crawl date.
 * @property {string} [endCrawlDate] - End date for results based on crawl date.
 * @property {string} [startPublishedDate] - Start date for results based on published date.
 * @property {string} [endPublishedDate] - End date for results based on published date.
 * @property {boolean} [excludeSourceDomain] - If true, excludes links from the base domain of the input.
 * @property {string} [category] - A data category to focus on, with higher comprehensivity and data cleanliness. Currently, the only category is company.
 * @property {string[]} [includeText] - List of strings that must be present in webpage text of results. Currently only supports 1 string of up to 5 words.
 * @property {string[]} [excludeText] - List of strings that must not be present in webpage text of results. Currently only supports 1 string of up to 5 words.
 */
export type FindSimilarOptions = BaseSearchOptions & {
  excludeSourceDomain?: boolean;
};

export type ExtrasOptions = {links: number}

/**
 * Search options for performing a search query.
 * @typedef {Object} ContentsOptions
 * @property {TextContentsOptions | boolean} [text] - Options for retrieving text contents.
 * @property {HighlightsContentsOptions | boolean} [highlights] - Options for retrieving highlights.
 * @property {SummaryContentsOptions | boolean} [summary] - Options for retrieving summary.
 * @property {LivecrawlOptions} [livecrawl] - Options for livecrawling contents. Default is "never" for neural/auto search, "fallback" for keyword search.
 * @property {number} [livecrawlTimeout] - The timeout for livecrawling. Max and default is 10000ms.
 * @property {boolean} [filterEmptyResults] - If true, filters out results with no contents. Default is true.
 * @property {number} [subpages] - The number of subpage to return for each result
 * @property {string | string[]} [subpageTarget] - Subpages targets to return in the subpages results. Eg. 'shop.tesla.com' for tesla.com
 * @property {ExtrasOptions} [extras] - Miscelleneous data for derived from resutls
 */

export type ContentsOptions = {
  text?: TextContentsOptions | true;
  highlights?: HighlightsContentsOptions | true;
  summary?: SummaryContentsOptions | true;
  livecrawl?: LivecrawlOptions;
  livecrawlTimeout?: number;
  filterEmptyResults?: boolean;
  subpages?: number
  subpageTarget?: string | string[]
  extras?: ExtrasOptions
} & (typeof isBeta extends true ? {} : {}); // FOR BETA OPTIONS

/**
 * Options for livecrawling contents
 * @typedef {string} LivecrawlOptions
 */
export type LivecrawlOptions = "never" | "fallback" | "always";

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
 * @typedef {Object} HighlightsContentsOptions
 * @property {string} [query] - The query string to use for highlights search.
 * @property {number} [numSentences] - The number of sentences to return for each highlight.
 * @property {number} [highlightsPerUrl] - The number of highlights to return for each URL.
 */
export type HighlightsContentsOptions = {
  query?: string;
  numSentences?: number;
  highlightsPerUrl?: number;
};

/**
 * Options for retrieving summary from page.
 * @typedef {Object} SummaryContentsOptions
 * @property {string} [query] - The query string to use for summary generation.
 */
export type SummaryContentsOptions = {
  query?: string;
};

/**
 * @typedef {Object} TextResponse
 * @property {string} text - Text from page
 */
export type TextResponse = { text: string };

/**
 * @typedef {Object} HighlightsResponse
 * @property {string[]} highlights - The highlights as an array of strings.
 * @property {number[]} highlightScores - The corresponding scores as an array of floats, 0 to 1
 */
export type HighlightsResponse = {
  highlights: string[];
  highlightScores: number[];
};

/**
 * @typedef {Object} SummaryResponse
 * @property {string} summary - The generated summary of the page content.
 */
export type SummaryResponse = { summary: string };

/**
 * @typedef {Object} ExtrasResponse
 * @property {string[]} links - The links on the page of a result
 */
export type ExtrasResponse = { extras: { links: string[] } };

/**
 * @typedef {Object} SubpagesResponse
 * @property {ContentsResultComponent<T extends ContentsOptions>} subpages - The links on the page of a result
 */
export type SubpagesResponse<T extends ContentsOptions> = {subpages: ContentsResultComponent<T>[]}


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
  (T["extras"] extends object ? ExtrasResponse : {} )

/**
 * Represents a search result object.
 * @typedef {Object} SearchResult
 * @property {string} title - The title of the search result.
 * @property {string} url - The URL of the search result.
 * @property {string} [publishedDate] - The estimated creation date of the content.
 * @property {string} [author] - The author of the content, if available.
 * @property {number} [score] - Similarity score between the query/url and the result.
 * @property {string} id - The temporary ID for the document.
 */
export type SearchResult<T extends ContentsOptions> = {
  title: string | null;
  url: string;
  publishedDate?: string;
  author?: string;
  score?: number;
  id: string;
  image?: string;
} & ContentsResultComponent<T>;

/**
 * Represents a search response object.
 * @typedef {Object} SearchResponse
 * @property {Result[]} results - The list of search results.
 * @property {string} [autopromptString] - The autoprompt string, if applicable.
 * @property {string} [autoDate] - The autoprompt date, if applicable.
 * @property {string} requestId - The request ID for the search.
 */
export type SearchResponse<T extends ContentsOptions> = {
  results: SearchResult<T>[];
  autopromptString?: string;
  autoDate?: string;
  requestId: string;
};

/**
 * The Exa class encapsulates the API's endpoints.
 */
class Exa {
  private baseURL: string;
  private headers: Headers;

  private extractContentsOptions<T extends ContentsOptions>(options: T): {
    contentsOptions: ContentsOptions;
    restOptions: Omit<T, keyof ContentsOptions>;
  } {

    const { text, highlights, summary, subpages, subpageTarget, extras, livecrawl, livecrawlTimeout, ...rest } = options;

    const contentsOptions: ContentsOptions = {};
    if (text !== undefined) contentsOptions.text = text;
    if (highlights !== undefined) contentsOptions.highlights = highlights;
    if (summary !== undefined) contentsOptions.summary = summary;
    if (subpages !== undefined) contentsOptions.subpages = subpages;
    if (subpageTarget !== undefined) contentsOptions.subpageTarget = subpageTarget;
    if (extras !== undefined) contentsOptions.extras = extras;
    if (livecrawl !== undefined) contentsOptions.livecrawl = livecrawl;
    if (livecrawlTimeout !== undefined) contentsOptions.livecrawlTimeout = livecrawlTimeout;

    return {
      contentsOptions: contentsOptions,
      restOptions: rest as Omit<T, keyof ContentsOptions>
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
      apiKey = process.env.EXASEARCH_API_KEY;
      if (!apiKey) {
        throw new Error(
          "API key must be provided as an argument or as an environment variable (EXASEARCH_API_KEY)",
        );
      }
    }
    this.headers = new Headers({
      "x-api-key": apiKey,
      "Content-Type": "application/json",
      "User-Agent": "exa-node 1.3.0",
    });
  }

  /**
   * Makes a request to the Exa API.
   * @param {string} endpoint - The API endpoint to call.
   * @param {string} method - The HTTP method to use.
   * @param {any} [body] - The request body for POST requests.
   * @returns {Promise<any>} The response from the API.
   */
  private async request(
    endpoint: string,
    method: string,
    body?: any,
  ): Promise<any> {
    const response = await fetch(this.baseURL + endpoint, {
      method,
      headers: this.headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const message = (await response.json()).error;
      throw new Error(
        `Request failed with status ${response.status}. ${message}`,
      );
    }

    return await response.json();
  }


  /**
   * Performs a search with a Exa prompt-engineered query.
   * @param {string} query - The query string.
   * @param {SearchOptions} [options] - Additional search options.
   * @returns {Promise<SearchResponse>} A list of relevant search results.
   */
  async search(
    query: string,
    options?: RegularSearchOptions,
  ): Promise<SearchResponse<{}>> {
    return await this.request("/search", "POST", { query, ...options });
  }

  /**
   * Performs a search with a Exa prompt-engineered query and returns the contents of the documents.
   * @param {string} query - The query string.
   * @param {SearchOptions} [options] - Additional search options.
   * @returns {Promise<SearchResponse>} A list of relevant search results.
   */
  async searchAndContents<T extends ContentsOptions = {text: true}>(
    query: string,
    options?: RegularSearchOptions & T,
  ): Promise<SearchResponse<T>> {
    const { contentsOptions, restOptions } = options === undefined ? 
      { contentsOptions: { text: true }, restOptions: {}} :
      this.extractContentsOptions(options);

    return await this.request("/search", "POST", {
      query,
      contents: contentsOptions,
      ...restOptions,
    });
  }

  /**
   * Finds similar links to the provided URL.
   * @param {string} url - The URL for which to find similar links.
   * @param {FindSimilarOptions} [options] - Additional options for finding similar links.
   * @returns {Promise<SearchResponse>} A list of similar search results.
   */
  async findSimilar(
    url: string,
    options?: FindSimilarOptions,
  ): Promise<SearchResponse<{}>> {
    return await this.request("/findSimilar", "POST", { url, ...options });
  }

  /** Finds similar links to the provided URL and returns the contents of the documents. @param {string} url - The URL for which to find similar links. @param {FindSimilarOptions} [options] - Additional options for finding similar links. @returns {Promise<SearchResponse>} A list of similar search results. */ 
  async findSimilarAndContents<T extends ContentsOptions = {text: true}>(
    url: string,
    options?: FindSimilarOptions & T,
  ): Promise<SearchResponse<T>> {
    const { contentsOptions, restOptions } = options === undefined ?
      {contentsOptions: {text: true}, restOptions: {}} :
      this.extractContentsOptions(options);
     
    return await this.request("/findSimilar", "POST", {
      url,
      contents: contentsOptions,
      ...restOptions,
    });
  }

  /**
   * Retrieves contents of documents based on a list of document IDs.
   * @param {string | string[] | SearchResult[]} ids - An array of document IDs.
   * @param {ContentsOptions} [options] - Additional options for retrieving document contents.
   * @returns {Promise<GetContentsResponse>} A list of document contents.
   */
  async getContents<T extends ContentsOptions = {text: true}>(
    ids: string | string[] | SearchResult<T>[],
    options?: T,
  ): Promise<SearchResponse<T>> {
    if (ids.length === 0) {
      throw new Error("Must provide at least one ID");
    }
    let requestIds: string[];
    if (typeof ids === "string") {
      requestIds = [ids];
    } else if (typeof ids[0] === "string") {
      requestIds = ids as string[];
    } else {
      requestIds = (ids as SearchResult<T>[]).map((result) => result.id);
    }
    return await this.request(`/contents`, "POST", {
      ids: requestIds,
      ...options,
    });
  }
}

export default Exa;
