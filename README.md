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
const textContentsResults = await exa.getContents(["urls"], { text: true });

// Get highlights
const highlightsContentsResults = await exa.getContents(["urls"], { highlights: true });

// Get contents with contents options
const customContentsResults = await exa.getContents(["urls"], {
  text: { includeHtmlTags: true, maxCharacters: 1000 },
  highlights: { highlightsPerUrl: 2, numSentences: 1, query: "This is the highlight query:" }
});

// Get an answer to a question
const answerResult = await exa.answer("What is the population of New York City?");

// Get answer with citation contents and use the exa-pro model, which passes 2 extra queries to exa to increase coverage of the search space. 
const answerWithTextResults = await exa.answer("What is the population of New York City?", {
  text: true,
  model: "exa-pro"
});

// Get an answer with streaming
for await (const chunk of exa.streamAnswer("What is the population of New York City?")) {
  if (chunk.content) {
    process.stdout.write(chunk.content);
  }
  if (chunk.citations) {
    console.log("\nCitations:", chunk.citations);
  }
}
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

### `exa.getContents(urls: string[] | Result[]): Promise<GetContentsResponse>`
Retrieves the contents of the specified documents.

```javascript
const response = await exa.getContents(['8U71IlQ5DUTdsZFherhhYA', 'X3wd0PbJmAvhu_DQjDKA7A']);
```

### `exa.answer(query: string, options?: AnswerOptions): Promise<AnswerResponse>`
Generates an answer to a query using search results as context.

```javascript
const response = await exa.answer('What is the population of New York City?', {
  text: true
});
```

### `exa.streamAnswer(query: string, options?: { text?: boolean }): AsyncGenerator<AnswerStreamChunk>`
Streams an answer as it's being generated, yielding chunks of text and citations. This is useful for providing real-time updates in chat interfaces or displaying partial results as they become available.

```javascript
// Basic streaming example
for await (const chunk of exa.streamAnswer("What is quantum computing?")) {
  if (chunk.content) {
    process.stdout.write(chunk.content);
  }
  if (chunk.citations) {
    console.log("\nCitations:", chunk.citations);
  }
}

for await (const chunk of exa.streamAnswer("What is quantum computing?", { text: true })) {
}
```

Each chunk contains:
- `content`: A string containing the next piece of generated text
- `citations`: An array of citation objects containing source information

# Contributing
Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.
