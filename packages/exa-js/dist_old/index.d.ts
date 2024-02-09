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
 */
type BaseSearchOptions = {
    numResults?: number;
    includeDomains?: string[];
    excludeDomains?: string[];
    startCrawlDate?: string;
    endCrawlDate?: string;
    startPublishedDate?: string;
    endPublishedDate?: string;
    category?: string;
};
/**
 * Search options for performing a search query.
 * @typedef {Object} ContentsOptions
 * @property {string[]} [formats] - An array of format types asked for. Currently supports `extract` (first 1000 tokens) and `text` (full parsed HTML text). If this isn't specified, defaults to `extract`.
 */
type RegularSearchOptions = BaseSearchOptions & {
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
 */
type FindSimilarOptions = BaseSearchOptions & {
    excludeSourceDomain?: boolean;
};
/**
 * Search options for performing a search query.
 * @typedef {Object} ContentsOptions
 * @property {TextContentsOptions | boolean} [text] - Options for retrieving text contents.
 * @property {HighlightsContentsOptions | boolean} [highlights] - Options for retrieving highlights.
 */
type ContentsOptions = {
    text?: TextContentsOptions | true;
    highlights?: HighlightsContentsOptions | true;
};
/**
 * Options for retrieving text from page.
 * @typedef {Object} TextContentsOptions
 * @property {number} [maxCharacters] - The maximum number of characters to return.
 * @property {boolean} [includeHtmlTags] - If true, includes HTML tags in the returned text. Default: false
 */
type TextContentsOptions = {
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
type HighlightsContentsOptions = {
    query?: string;
    numSentences?: number;
    highlightsPerUrl?: number;
};
/**
 * @typedef {Object} TextResponse
 * @property {string} text - Text from page
 */
type TextResponse = {
    text: string;
};
/**
 * @typedef {Object} HighlightsResponse
 * @property {string[]} highlights - The highlights as an array of strings.
 * @property {number[]} highlightScores - The corresponding scores as an array of floats, 0 to 1
 */
type HighlightsResponse = {
    highlights: string[];
    highlightScores: number[];
};
type Default<T extends {}, U> = [keyof T] extends [never] ? U : T;
/**
 * @typedef {Object} ContentsResultComponent
 * Depending on 'ContentsOptions', this yields either a 'TextResponse', a 'HighlightsResponse', both, or an empty object.
 *
 * @template T - A type extending from 'ContentsOptions'.
 */
type ContentsResultComponent<T extends ContentsOptions> = Default<(T["text"] extends object | true ? TextResponse : {}) & (T["highlights"] extends object | true ? HighlightsResponse : {}), TextResponse>;
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
type SearchResult<T extends ContentsOptions = {}> = {
    title: string | null;
    url: string;
    publishedDate?: string;
    author?: string;
    score?: number;
    id: string;
} & ContentsResultComponent<T>;
/**
 * Represents a search response object.
 * @typedef {Object} SearchResponse
 * @property {Result[]} results - The list of search results.
 * @property {string} [autopromptString] - The autoprompt string, if applicable.
 */
type SearchResponse<T extends ContentsOptions = {}> = {
    results: SearchResult<T>[];
    autopromptString?: string;
};

/**
 * The Exa class encapsulates the API's endpoints.
 */
declare class Exa {
    private baseURL;
    private headers;
    /**
     * Constructs the Exa API client.
     * @param {string} apiKey - The API key for authentication.
     * @param {string} [baseURL] - The base URL of the Exa API.
     */
    constructor(apiKey?: string, baseURL?: string);
    /**
     * Makes a request to the Exa API.
     * @param {string} endpoint - The API endpoint to call.
     * @param {string} method - The HTTP method to use.
     * @param {any} [body] - The request body for POST requests.
     * @returns {Promise<SearchResponse>} The response from the API.
     */
    private request;
    /**
     * Performs a search with a Exa prompt-engineered query.
     * @param {string} query - The query string.
     * @param {SearchOptions} [options] - Additional search options.
     * @returns {Promise<SearchResponse>} A list of relevant search results.
     */
    search(query: string, options?: RegularSearchOptions): Promise<SearchResponse>;
    /**
     * Performs a search with a Exa prompt-engineered query and returns the contents of the documents.
     * @param {string} query - The query string.
     * @param {SearchOptions} [options] - Additional search options.
     * @returns {Promise<SearchResponse>} A list of relevant search results.
     */
    searchAndContents<T extends ContentsOptions>(query: string, options?: RegularSearchOptions & T): Promise<SearchResponse<T>>;
    /**
     * Finds similar links to the provided URL.
     * @param {string} url - The URL for which to find similar links.
     * @param {FindSimilarOptions} [options] - Additional options for finding similar links.
     * @returns {Promise<SearchResponse>} A list of similar search results.
     */
    findSimilar(url: string, options?: FindSimilarOptions): Promise<SearchResponse>;
    /**
     * Finds similar links to the provided URL and returns the contents of the documents.
     * @param {string} url - The URL for which to find similar links.
     * @param {FindSimilarOptions} [options] - Additional options for finding similar links.
     * @returns {Promise<SearchResponse>} A list of similar search results.
     */
    findSimilarAndContents<T extends ContentsOptions>(url: string, options?: FindSimilarOptions & T): Promise<SearchResponse<T>>;
    /**
     * Retrieves contents of documents based on a list of document IDs.
     * @param {string | string[] | SearchResult[]} ids - An array of document IDs.
     * @param {ContentsOptions} [options] - Additional options for retrieving document contents.
     * @returns {Promise<GetContentsResponse>} A list of document contents.
     */
    getContents<T extends ContentsOptions>(ids: string | string[] | SearchResult[], options?: T): Promise<SearchResponse<T>>;
}

export { Exa as default };
