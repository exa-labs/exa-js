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
export type BaseSearchOptions = {
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
 */
export type FindSimilarOptions = BaseSearchOptions & {
  excludeSourceDomain?: boolean;
};

/**
 * Search options for performing a search query.
 * @typedef {Object} ContentsOptions
 * @property {TextContentsOptions | boolean} [text] - Options for retrieving text contents.
 * @property {HighlightsContentsOptions | boolean} [highlights] - Options for retrieving highlights.
 */
export type ContentsOptions = {
  text?: TextContentsOptions | true;
  highlights?: HighlightsContentsOptions | true;
};

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

export type Default<T extends {}, U> = [keyof T] extends [never] ? U : T;

/**
 * @typedef {Object} ContentsResultComponent
 * Depending on 'ContentsOptions', this yields either a 'TextResponse', a 'HighlightsResponse', both, or an empty object.
 *
 * @template T - A type extending from 'ContentsOptions'.
 */
export type ContentsResultComponent<T extends ContentsOptions> = Default<
  (T["text"] extends object | true ? TextResponse : {}) &
    (T["highlights"] extends object | true ? HighlightsResponse : {}),
  TextResponse
>;

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
export type SearchResult<T extends ContentsOptions = {}> = {
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
export type SearchResponse<T extends ContentsOptions = {}> = {
  results: SearchResult<T>[];
  autopromptString?: string;
};
