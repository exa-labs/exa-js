export interface SearchRequest {
    query: string;
    numResults?: number;
    includeDomains?: string[];
    excludeDomains?: string[];
    startCrawlDate?: string;
    endCrawlDate?: string;
    startPublishedDate?: string;
    endPublishedDate?: string;
    useAutoprompt?: string;
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
    autopromptString?: string;
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
    id: string;
    url: string;
    title: string;
    extract: string;
}
export interface GetContentsResponse {
    contents: DocumentContent[];
}
export default class Metaphor {
    private client;
    constructor(apiKey: string);
    search(request: SearchRequest): Promise<SearchResponse>;
    findSimilar(request: FindSimilarRequest): Promise<SearchResponse>;
    getContents(request: GetContentsRequest): Promise<GetContentsResponse>;
}
