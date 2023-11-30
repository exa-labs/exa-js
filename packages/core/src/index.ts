import fetch, { Headers } from "cross-fetch";

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
 */
interface SearchOptions {
  numResults?: number;
  includeDomains?: string[];
  excludeDomains?: string[];
  startCrawlDate?: string;
  endCrawlDate?: string;
  startPublishedDate?: string;
  endPublishedDate?: string;
  useAutoprompt?: boolean;
  type?: string;
}

/**
 * Represents a search result object.
 * @typedef {Object} Result
 * @property {string} title - The title of the search result.
 * @property {string} url - The URL of the search result.
 * @property {string} [publishedDate] - The estimated creation date of the content.
 * @property {string} [author] - The author of the content, if available.
 * @property {number} [score] - Similarity score between the query/url and the result.
 * @property {string} id - The temporary ID for the document.
 */
interface Result {
  title: string;
  url: string;
  publishedDate?: string;
  author?: string;
  score?: number;
  id: string;
}

/**
 * Represents the response from the /search endpoint.
 * @typedef {Object} SearchResponse
 * @property {Result[]} results - Array of result objects.
 * @property {string} [autopromptString] - The Metaphor query created by autoprompt.
 */
interface SearchResponse {
  results: Result[];
  autopromptString?: string;
}

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
 */
interface FindSimilarOptions {
  numResults?: number;
  includeDomains?: string[];
  excludeDomains?: string[];
  startCrawlDate?: string;
  endCrawlDate?: string;
  startPublishedDate?: string;
  endPublishedDate?: string;
  excludeSourceDomain?: boolean;
}

/**
 * Represents the content of a document.
 * @typedef {Object} DocumentContent
 * @property {string} id - The ID of the document.
 * @property {string} url - The URL of the document.
 * @property {string} title - The title of the document.
 * @property {string} extract - The first 1000 tokens of content in the document.
 * @property {string} [author] - The author of the content, if available.
 */
interface DocumentContent {
  id: string;
  url: string;
  title: string;
  extract: string;
  author?: string | null;
}

/**
 * Represents the response from the /contents endpoint.
 * @typedef {Object} GetContentsResponse
 * @property {DocumentContent[]} contents - Array of document content objects.
 */
interface GetContentsResponse {
  contents: DocumentContent[];
}

/**
 * The Metaphor class encapsulates the API's endpoints.
 */
class Metaphor {
  private baseURL: string;
  private headers: Headers;

  /**
   * Constructs the Metaphor API client.
   * @param {string} apiKey - The API key for authentication.
   * @param {string} [baseURL] - The base URL of the Metaphor API.
   */
  constructor(
    apiKey: string,
    baseURL: string = "https://api.metaphor.systems"
  ) {
    this.baseURL = baseURL;
    this.headers = new Headers({
      "x-api-key": apiKey,
      "Content-Type": "application/json",
      "User-Agent": "metaphor-node 1.0.26",
    });
  }

  /**
   * Makes a request to the Metaphor API.
   * @param {string} endpoint - The API endpoint to call.
   * @param {string} method - The HTTP method to use.
   * @param {any} [body] - The request body for POST requests.
   * @returns {Promise<any>} The response from the API.
   */
  private async request(
    endpoint: string,
    method: string,
    body?: any
  ): Promise<any> {
    const response = await fetch(this.baseURL + endpoint, {
      method,
      headers: this.headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const message = (await response.json()).error;
      throw new Error(
        `Request failed with status ${response.status}. ${message}`
      );
    }

    return await response.json();
  }

  /**
   * Performs a search with a Metaphor prompt-engineered query.
   * @param {string} query - The query string.
   * @param {SearchOptions} [options] - Additional search options.
   * @returns {Promise<SearchResponse>} A list of relevant search results.
   */
  async search(
    query: string,
    options?: SearchOptions
  ): Promise<SearchResponse> {
    return await this.request("/search", "POST", { query, ...options });
  }

  /**
   * Finds similar links to the provided URL.
   * @param {string} url - The URL for which to find similar links.
   * @param {FindSimilarOptions} [options] - Additional options for finding similar links.
   * @returns {Promise<SearchResponse>} A list of similar search results.
   */
  async findSimilar(
    url: string,
    options?: FindSimilarOptions
  ): Promise<SearchResponse> {
    return await this.request("/findSimilar", "POST", { url, ...options });
  }

  /**
   * Retrieves contents of documents based on a list of document IDs.
   * @param {string[] | Result[]} ids - An array of document IDs.
   * @returns {Promise<GetContentsResponse>} A list of document contents.
   */
  async getContents(ids: string[] | Result[]): Promise<GetContentsResponse> {
    if (ids.length === 0) {
      throw new Error("Must provide at least one ID");
    }
    let requestIds: string[];
    if (typeof ids[0] === "string") {
      requestIds = ids as string[];
    } else {
      requestIds = (ids as Result[]).map((result) => result.id);
    }

    const params = new URLSearchParams({ ids: requestIds.join(",") });
    return await this.request(`/contents?${params}`, "GET");
  }
}

// NAMED EXPORTS
export type {
  SearchOptions,
  Result,
  SearchResponse,
  FindSimilarOptions,
  DocumentContent,
  GetContentsResponse,
};

export default Metaphor;
