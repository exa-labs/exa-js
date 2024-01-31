# exa-js

Our official Javscript SDK. Uses `cross-fetch` under the hood.

Note: This API is basically the same as `metaphor-node` but reflects new
features associated with Metaphor's rename to Exa. New site is https://exa.ai

https://www.npmjs.com/package/exa-js

## Installation
```
npm install exa-js
```

## Initialization 
```js
import Exa from "exa-js"

const exa = new Exa(process.env.EXA_API_KEY)
```

### Common commands

```js

// Basic search
const basicResults = await exa.search("This is a Exa query:");

// Autoprompted search
const autoPromptedResults = await exa.search("autopromptable query", { useAutoprompt: true });

// Search with date filters
const dateFilteredResults = await exa.search("This is a Exa query:", {
  startPublishedDate: "2019-01-01",
  endPublishedDate: "2019-01-31"
});

// Search with domain filters
const domainFilteredResults = await exa.search("This is a Exa query:", {
  includeDomains: ["www.cnn.com", "www.nytimes.com"]
});

// Search and get text contents
const searchAndTextResults = await exa.searchAndContents("This is a Exa query:", { text: true });

// Search and get highlights
const searchAndHighlightsResults = await exa.searchAndContents("This is a Exa query:", { highlights: true });

// Search and get contents with contents options
const searchAndCustomContentsResults = await exa.searchAndContents("This is a Exa query:", {
  text: { includeHtmlTags: true, maxCharacters: 1000 },
  highlights: { highlightsPerUrl: 2, numSentences: 1, query: "This is the highlight query:" }
});

// Find similar documents
const similarResults = await exa.findSimilar("https://example.com");

// Find similar excluding source domain
const similarExcludingSourceResults = await exa.findSimilar("https://example.com", { excludeSourceDomain: true });

// Find similar with contents
const similarWithContentsResults = await exa.findSimilarAndContents("https://example.com", { text: true, highlights: true });

// Get text contents
const textContentsResults = await exa.getContents(["ids"], { text: true });

// Get highlights
const highlightsContentsResults = await exa.getContents(["ids"], { highlights: true });

// Get contents with contents options
const customContentsResults = await exa.getContents(["ids"], {
  text: { includeHtmlTags: true, maxCharacters: 1000 },
  highlights: { highlightsPerUrl: 2, numSentences: 1, query: "This is the highlight query:" }
});
```

### `exa.search(query: string, options?: SearchOptions): Promise<SearchResponse>`
Performs a search on the Exa system with the given parameters.

```javascript
const response = await exa.search('funny article about tech culture', {
  numResults: 5,
  includeDomains: ['nytimes.com', 'wsj.com'], 
  startPublishedDate: '2023-06-12'
});
```

### `exa.findSimilar(url: string, options?: FindSimilarOptions): Promise<SearchResponse>`
Finds content similar to the specified URL.

```javascript
const response = await exa.findSimilar('https://waitbutwhy.com/2014/05/fermi-paradox.html', {
  numResults: 10
});
```

### `exa.getContents(ids: string[] | Result[]): Promise<GetContentsResponse>`
Retrieves the contents of the specified documents.

```javascript
const response = await exa.getContents(['8U71IlQ5DUTdsZFherhhYA', 'X3wd0PbJmAvhu_DQjDKA7A']);
```

# Contributing
Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.
