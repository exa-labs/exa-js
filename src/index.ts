import axios, { AxiosInstance, AxiosResponse } from 'axios';

// Search request interface corresponds to the request schema for the /search endpoint.
// It includes properties for the query, number of results, included and excluded domains, and date ranges for crawled and published data.
export interface SearchRequest {
  query: string; // A declarative suggestion query string. Example: "Here is an article about the state of search:"
  numResults?: number; // Number of search results to return. Maximum 500. Default 100
  includeDomains?: string[]; // Include results only from these domains. Example: ["example.com", "sample.net"]
  excludeDomains?: string[]; // Exclude results from these domains. Example: ["excludedomain.comcludeme.net"]
  startCrawlDate?: string; // Include results only that were crawled after this date. Must be in ISO 8601 format. Example: "2023-01-01"
  endCrawlDate?: string; // Include results only that were crawled before this date. Must be in ISO 8601 format. Example: "2023-12-31"
  startPublishedDate?: string; // Include only links with a published date after this. Must be in ISO 8601 format. Example: "2023-01-01"
  endPublishedDate?: string; // Include only links with a published date before this. Must be in ISO 8601 format. Example: "2023-12-31"
  useAutoprompt?: boolean; // Uses Metaphor-optimized query.
}

// The Result interface represents a search result object from the API.
export interface Result {
  title: string; // The title of the search result.
  url: string; // The URL of the search result.
  publishedDate?: string; // The estimated creation date of the content. Format is YYYY-MM-DD. Nullable
  author?: string; // The author of the content, if available. Nullable
  score: number; // A number from 0 to 1 representing similarity between the query/url and the result.
  id: string; // The temporary ID for the document. Useful for /contents endpoint.
}

// The SearchResponse interface represents the response from the /search endpoint.
// It includes an array of result objects.
export interface SearchResponse {
  results: Result[];
  autopromptString?: string; // The autoprompt string for the query, if useAutoprompt was on.
}

// FindSimilar request interface corresponds to the request schema for the /findSimilar endpoint.
// It includes properties for the URL to find similar links, number of results, included and excluded domains, and date ranges for crawled and published data.
export interface FindSimilarRequest {
  url: string; // The url for which you would like to find similar links. Example: "https://slatestarcodex.com/2014/07/30/meditations-on-moloch/"
  numResults?: number; // Number of search results to return. Maximum 500. Default 100
  includeDomains?: string[]; // Include results only from these domains. Example: ["example.com", "sample.net"]
  excludeDomains?: string[]; // Exclude results from these domains. Example: ["excludedomain.com", "excludeme.net"]
  startCrawlDate?: string; // The optional start date (inclusive) for the crawled data. Must be specified in ISO 8601 format. Example: "2023-01-01"
  endCrawlDate?: string; // The optional end date (inclusive) for the crawled data. Must be specified in ISO 8601 format. Example: "2023-12-31"
  startPublishedDate?: string; // The optional start date (inclusive) for the published data. Must be specified in ISO 8601 format. Example: "2023-01-01"
  endPublishedDate?: string; // The optional end date (inclusive) for the published data. Must be specified in ISO 8601 format. Example: "2023-12-31"
}

// The GetContentsRequest interface corresponds to the query parameters for the /contents endpoint.
// It includes an array of document IDs.
export interface GetContentsRequest {
  ids: string[]; // An array of document IDs obtained from either /search or /findSimilar endpoints.
}

// The DocumentContent interface represents the content of a document from the /contents endpoint.
export interface DocumentContent {
  id: string // The ID of the document.
  url: string; // The URL of the document.
  title: string; // The title of the document.
  extract: string; // The first 1000 tokens of content in the document.
}

// The GetContentsResponse interface represents the response from the /contents endpoint.
// It includes an array of document content objects.
export interface GetContentsResponse {
  contents: DocumentContent[];
}

// The Metaphor class encapsulates the API's endpoints.
export default class Metaphor {
  private client: AxiosInstance;

  constructor(apiKey: string) {
    this.client = axios.create({
      baseURL: 'https://api.metaphor.systems',
      headers: {
        'x-api-key': apiKey
      }
    });
  }

    async search(request: SearchRequest): Promise<SearchResponse> {
    const response = await this.client.post<SearchResponse>('/search', request);
    return response.data;
  }

  async findSimilar(request: FindSimilarRequest): Promise<SearchResponse> {
    const response = await this.client.post<SearchResponse>('/findSimilar', request);
    return response.data;
  }

  async getContents(request: GetContentsRequest): Promise<GetContentsResponse> {
    const response = await this.client.get<GetContentsResponse>('/contents', { params: request });
    return response.data;
  }
}
