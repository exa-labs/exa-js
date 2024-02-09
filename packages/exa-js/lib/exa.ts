import fetch, { Headers } from "cross-fetch";
import {
  RegularSearchOptions,
  SearchResponse,
  ContentsOptions,
  FindSimilarOptions,
  SearchResult,
} from "./exa.types";
import { constants } from "./exa.constants";

/**
 * The Exa class encapsulates the API's endpoints.
 */
class Exa {
  private baseURL: string;
  private headers: Headers;

  /**
   * Constructs the Exa API client.
   * @param {string} apiKey - The API key for authentication.
   * @param {string} [baseURL] - The base URL of the Exa API.
   */
  constructor(apiKey?: string, baseURL: string = constants.BASE_URL) {
    this.baseURL = baseURL;
    const currentApiKey = apiKey || process.env.EXASEARCH_API_KEY;
    if (!currentApiKey) {
      throw new Error(
        "API key must be provided as an argument or as an environment variable (EXASEARCH_API_KEY)"
      );
    }
    this.headers = new Headers({
      "x-api-key": currentApiKey,
      "Content-Type": constants.CONTENT_TYPE,
      "User-Agent": constants.USER_AGENT,
    });
  }

  /**
   * Makes a request to the Exa API.
   * @param {string} endpoint - The API endpoint to call.
   * @param {string} method - The HTTP method to use.
   * @param {any} [body] - The request body for POST requests.
   * @returns {Promise<SearchResponse>} The response from the API.
   */
  private async request<T = {}>(
    endpoint: string,
    method: string,
    body?: T
  ): Promise<SearchResponse> {
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
   * Performs a search with a Exa prompt-engineered query.
   * @param {string} query - The query string.
   * @param {SearchOptions} [options] - Additional search options.
   * @returns {Promise<SearchResponse>} A list of relevant search results.
   */
  async search(
    query: string,
    options?: RegularSearchOptions
  ): Promise<SearchResponse> {
    return await this.request(constants.ENDPOINTS.SEARCH, "POST", {
      query,
      ...options,
    });
  }

  /**
   * Performs a search with a Exa prompt-engineered query and returns the contents of the documents.
   * @param {string} query - The query string.
   * @param {SearchOptions} [options] - Additional search options.
   * @returns {Promise<SearchResponse>} A list of relevant search results.
   */
  async searchAndContents<T extends ContentsOptions>(
    query: string,
    options?: RegularSearchOptions & T
  ): Promise<SearchResponse<T>> {
    const { text, highlights, ...rest } = options || {};
    return await this.request(constants.ENDPOINTS.SEARCH, "POST", {
      query,
      contents:
        !text && !highlights
          ? { text: true }
          : {
              ...(text ? { text } : {}),
              ...(highlights ? { highlights } : {}),
            },
      ...rest,
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
    options?: FindSimilarOptions
  ): Promise<SearchResponse> {
    return await this.request(constants.ENDPOINTS.SIMILAR_SEARCH, "POST", {
      url,
      ...options,
    });
  }

  /**
   * Finds similar links to the provided URL and returns the contents of the documents.
   * @param {string} url - The URL for which to find similar links.
   * @param {FindSimilarOptions} [options] - Additional options for finding similar links.
   * @returns {Promise<SearchResponse>} A list of similar search results.
   */
  async findSimilarAndContents<T extends ContentsOptions>(
    url: string,
    options?: FindSimilarOptions & T
  ): Promise<SearchResponse<T>> {
    const { text, highlights, ...rest } = options || {};
    return await this.request(constants.ENDPOINTS.SIMILAR_SEARCH, "POST", {
      url,
      contents:
        !text && !highlights
          ? { text: true }
          : {
              ...(text ? { text } : {}),
              ...(highlights ? { highlights } : {}),
            },
      ...rest,
    });
  }

  /**
   * Retrieves contents of documents based on a list of document IDs.
   * @param {string | string[] | SearchResult[]} ids - An array of document IDs.
   * @param {ContentsOptions} [options] - Additional options for retrieving document contents.
   * @returns {Promise<GetContentsResponse>} A list of document contents.
   */
  async getContents<T extends ContentsOptions>(
    ids: string | string[] | SearchResult[],
    options?: T
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
      requestIds = (ids as SearchResult[]).map((result) => result.id);
    }
    return await this.request(constants.ENDPOINTS.CONTENTS, "POST", {
      ids: requestIds,
      ...options,
    });
  }
}

export default Exa;
