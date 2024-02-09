// src/index.ts
import fetch, { Headers } from "cross-fetch";

// src/exa.constants.ts
var BASE_URL = "https://api.exa.ai";
var USER_AGENT = "exa-node 1.0.27";
var CONTENT_TYPE = "application/json";
var ENDPOINTS = {
  SEARCH: "/search",
  SIMILAR_SEARCH: "/findSimilar",
  CONTENTS: "/contents"
};
var constants = {
  BASE_URL,
  USER_AGENT,
  CONTENT_TYPE,
  ENDPOINTS
};

// src/index.ts
var Exa = class {
  /**
   * Constructs the Exa API client.
   * @param {string} apiKey - The API key for authentication.
   * @param {string} [baseURL] - The base URL of the Exa API.
   */
  constructor(apiKey, baseURL = constants.BASE_URL) {
    this.baseURL = baseURL;
    if (!apiKey) {
      apiKey = process.env.EXASEARCH_API_KEY;
      if (!apiKey) {
        throw new Error(
          "API key must be provided as an argument or as an environment variable (EXASEARCH_API_KEY)"
        );
      }
    }
    this.headers = new Headers({
      "x-api-key": apiKey,
      "Content-Type": constants.CONTENT_TYPE,
      "User-Agent": constants.USER_AGENT
    });
  }
  /**
   * Makes a request to the Exa API.
   * @param {string} endpoint - The API endpoint to call.
   * @param {string} method - The HTTP method to use.
   * @param {any} [body] - The request body for POST requests.
   * @returns {Promise<SearchResponse>} The response from the API.
   */
  async request(endpoint, method, body) {
    const response = await fetch(this.baseURL + endpoint, {
      method,
      headers: this.headers,
      body: body ? JSON.stringify(body) : void 0
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
  async search(query, options) {
    return await this.request(constants.ENDPOINTS.SEARCH, "POST", {
      query,
      ...options
    });
  }
  /**
   * Performs a search with a Exa prompt-engineered query and returns the contents of the documents.
   * @param {string} query - The query string.
   * @param {SearchOptions} [options] - Additional search options.
   * @returns {Promise<SearchResponse>} A list of relevant search results.
   */
  async searchAndContents(query, options) {
    const { text, highlights, ...rest } = options || {};
    return await this.request(constants.ENDPOINTS.SEARCH, "POST", {
      query,
      contents: !text && !highlights ? { text: true } : {
        ...text ? { text } : {},
        ...highlights ? { highlights } : {}
      },
      ...rest
    });
  }
  /**
   * Finds similar links to the provided URL.
   * @param {string} url - The URL for which to find similar links.
   * @param {FindSimilarOptions} [options] - Additional options for finding similar links.
   * @returns {Promise<SearchResponse>} A list of similar search results.
   */
  async findSimilar(url, options) {
    return await this.request(constants.ENDPOINTS.SIMILAR_SEARCH, "POST", {
      url,
      ...options
    });
  }
  /**
   * Finds similar links to the provided URL and returns the contents of the documents.
   * @param {string} url - The URL for which to find similar links.
   * @param {FindSimilarOptions} [options] - Additional options for finding similar links.
   * @returns {Promise<SearchResponse>} A list of similar search results.
   */
  async findSimilarAndContents(url, options) {
    const { text, highlights, ...rest } = options || {};
    return await this.request(constants.ENDPOINTS.SIMILAR_SEARCH, "POST", {
      url,
      contents: !text && !highlights ? { text: true } : {
        ...text ? { text } : {},
        ...highlights ? { highlights } : {}
      },
      ...rest
    });
  }
  /**
   * Retrieves contents of documents based on a list of document IDs.
   * @param {string | string[] | SearchResult[]} ids - An array of document IDs.
   * @param {ContentsOptions} [options] - Additional options for retrieving document contents.
   * @returns {Promise<GetContentsResponse>} A list of document contents.
   */
  async getContents(ids, options) {
    if (ids.length === 0) {
      throw new Error("Must provide at least one ID");
    }
    let requestIds;
    if (typeof ids === "string") {
      requestIds = [ids];
    } else if (typeof ids[0] === "string") {
      requestIds = ids;
    } else {
      requestIds = ids.map((result) => result.id);
    }
    return await this.request(constants.ENDPOINTS.CONTENTS, "POST", {
      ids: requestIds,
      ...options
    });
  }
};
var src_default = Exa;
export {
  src_default as default
};
//# sourceMappingURL=index.mjs.map