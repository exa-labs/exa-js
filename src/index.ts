import axios, { AxiosInstance } from 'axios';

// Search options interface corresponds to the request schema for the /search endpoint without the query, which is the first parameter in  search()
export interface SearchOptions {
  numResults?: number; // Number of search results to return. Maximum 100. Default 10
  includeDomains?: string[]; // Include results only from these domains. Example: ["example.com", "sample.net"]
  excludeDomains?: string[]; // Exclude results from these domains. Example: ["excludedomain.comcludeme.net"]
  startCrawlDate?: string; // Include results only that were crawled after this date. Must be in ISO 8601 format. Example: "2023-01-01"
  endCrawlDate?: string; // Include results only that were crawled before this date. Must be in ISO 8601 format. Example: "2023-12-31"
  startPublishedDate?: string; // Include only links with a published date after this. Must be in ISO 8601 format. Example: "2023-01-01"
  endPublishedDate?: string; // Include only links with a published date before this. Must be in ISO 8601 format. Example: "2023-12-31"
  useAutoprompt?: boolean; // Uses Metaphor-optimized query.
  type?: string; // Search can be 'keyword' or 'neural'. Default is 'neural'
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

// FindSimilarOptions interface corresponds to the request schema for the /findSimilar endpoint without the url, which is the first parameter in findSimilar()
export interface FindSimilarOptions {
  numResults?: number; // Number of search results to return. Maximum 100. Default 10
  includeDomains?: string[]; // Include results only from these domains. Example: ["example.com", "sample.net"]
  excludeDomains?: string[]; // Exclude results from these domains. Example: ["excludedomain.com", "excludeme.net"]
  startCrawlDate?: string; // The optional start date (inclusive) for the crawled data. Must be specified in ISO 8601 format. Example: "2023-01-01"
  endCrawlDate?: string; // The optional end date (inclusive) for the crawled data. Must be specified in ISO 8601 format. Example: "2023-12-31"
  startPublishedDate?: string; // The optional start date (inclusive) for the published data. Must be specified in ISO 8601 format. Example: "2023-01-01"
  endPublishedDate?: string; // The optional end date (inclusive) for the published data. Must be specified in ISO 8601 format. Example: "2023-12-31"
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

  constructor(apiKey: string, baseURL: string = 'https://api.metaphor.systems') {
    this.client = axios.create({ baseURL,
      headers: {
        'x-api-key': apiKey
      }
    });
  }

  async search(query: string, options?: SearchOptions): Promise<SearchResponse> {
    const response = await this.client.post<SearchResponse>('/search', {query, ...options});
    return response.data;
  }

  async findSimilar(url: string, options?: FindSimilarOptions): Promise<SearchResponse> {
    const response = await this.client.post<SearchResponse>('/findSimilar', {url, ...options});
    return response.data;
  }

  async getContents(ids: string[] | Result[]): Promise<GetContentsResponse> {
    let requestIds: string[];

    // Check if the first element is a string or not. If it's a string, it's an ID array.
    if (typeof ids[0] === 'string') {
      requestIds = ids as string[];
    } else {
      // If it's not a string, then it's a Result array.
      requestIds = (ids as Result[]).map(result => result.id);
    }

    const response = await this.client.get<GetContentsResponse>('/contents', { params: { ids: requestIds } });
    return response.data;
  }
}
