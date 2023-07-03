import axios, { AxiosInstance, AxiosResponse } from 'axios';

export interface SearchRequest {
  query: string;
  numResults?: number;
  includeDomains?: string[];
  excludeDomains?: string[];
  startCrawlDate?: string;
  endCrawlDate?: string;
  startPublishedDate?: string;
  endPublishedDate?: string;
}

export interface Result {
  title: string;
  url: string;
  publishedDate?: string;
  author?: string;
  score: number;
  id: string;
}

export interface SearchResponse {
  results: Result[];
}

export interface FindSimilarRequest {
  url: string;
  numResults?: number;
  includeDomains?: string[];
  excludeDomains?: string[];
  startCrawlDate?: string;
  endCrawlDate?: string;
  startPublishedDate?: string;
  endPublishedDate?: string;
}

export interface GetContentsRequest {
  ids: string[];
}

export interface DocumentContent {
  url: string;
  title: string;
  extract: string;
}

interface GetContentsResponse {
  contents: DocumentContent[];
}

export default class MetaphorAPI {
  private client: AxiosInstance;

  constructor(apiKey: string) {
    this.client = axios.create({
      baseURL: 'https://api.metaphor.systems',
      headers: {
        'x-api-key': apiKey
      }
    });
  }

  async search(request: SearchRequest): Promise<AxiosResponse<SearchResponse>> {
    return this.client.post('/search', request);
  }

  async findSimilar(request: FindSimilarRequest): Promise<AxiosResponse<SearchResponse>> {
    return this.client.post('/findSimilar', request);
  }

  async getContents(request: GetContentsRequest): Promise<AxiosResponse<GetContentsResponse>> {
    return this.client.get('/contents', { params: request });
  }
}
