export interface SearchOptions {
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
export interface Result {
    title: string;
    url: string;
    publishedDate?: string;
    author?: string;
    score?: number;
    id: string;
}
export interface SearchResponse {
    results: Result[];
    autopromptString?: string;
}
export interface FindSimilarOptions {
    numResults?: number;
    includeDomains?: string[];
    excludeDomains?: string[];
    startCrawlDate?: string;
    endCrawlDate?: string;
    startPublishedDate?: string;
    endPublishedDate?: string;
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
    private baseURL;
    private headers;
    constructor(apiKey: string, baseURL?: string);
    private request;
    search(query: string, options?: SearchOptions): Promise<SearchResponse>;
    findSimilar(url: string, options?: FindSimilarOptions): Promise<SearchResponse>;
    getContents(ids: string[] | Result[]): Promise<GetContentsResponse>;
}
