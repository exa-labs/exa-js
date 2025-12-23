# exa-js

The official JavaScript/TypeScript SDK for [Exa](https://exa.ai), the search engine for AI.

[![npm version](https://badge.fury.io/js/exa-js.svg)](https://www.npmjs.com/package/exa-js)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Installation

```bash
npm install exa-js
```

**Requirements:** Node.js 18.0.0 or higher

## Quick Start

```js
import Exa from "exa-js";

const exa = new Exa(process.env.EXA_API_KEY);

// Search returns text content by default
const results = await exa.search("Latest developments in quantum computing");
console.log(results.results[0].text);
```

## Core Features

### Search

```js
// Basic search - returns text content by default (10,000 chars)
const results = await exa.search("machine learning frameworks");

// Search with filters
const filtered = await exa.search("AI startups", {
  startPublishedDate: "2024-01-01",
  includeDomains: ["techcrunch.com", "wired.com"],
  numResults: 10,
});

// Search with custom content options
const withSummary = await exa.search("climate change research", {
  contents: {
    text: { maxCharacters: 5000 },
    summary: true,
    highlights: true,
  },
});

// Search without content (metadata only)
const metadataOnly = await exa.search("tech news", { contents: false });

// Deep search for comprehensive results
const deepResults = await exa.search("quantum computing applications", {
  type: "deep",
  contents: { text: true, context: true },
});
```

### Find Similar

```js
// Find pages similar to a URL
const similar = await exa.findSimilar("https://example.com/article");

// With content options
const similarWithContent = await exa.findSimilar("https://example.com", {
  contents: { text: true, summary: true },
  excludeSourceDomain: true,
});
```

### Get Contents

```js
// Retrieve content for specific URLs
const contents = await exa.getContents(
  ["https://example.com/page1", "https://example.com/page2"],
  { text: true, highlights: true }
);
```

### Answer (RAG)

```js
// Get an AI-generated answer with citations
const answer = await exa.answer("What is the population of New York City?");
console.log(answer.answer);
console.log(answer.citations);

// With structured output using JSON schema
const structured = await exa.answer("List the top 3 AI companies", {
  outputSchema: {
    type: "object",
    properties: {
      companies: {
        type: "array",
        items: { type: "string" },
      },
    },
  },
});

// With Zod schema for type safety
import { z } from "zod";

const schema = z.object({
  population: z.number(),
  lastUpdated: z.string(),
});

const typedAnswer = await exa.answer("NYC population?", {
  outputSchema: schema,
});
// typedAnswer.answer is strongly typed!
```

### Streaming Answers

```js
// Stream answers in real-time
for await (const chunk of exa.streamAnswer("Explain quantum entanglement", {
  timeoutMs: 30000, // 30 second timeout
})) {
  if (chunk.content) {
    process.stdout.write(chunk.content);
  }
  if (chunk.citations) {
    console.log("\nCitations:", chunk.citations);
  }
}
```

### Research API

```js
// Create autonomous research tasks
const { id } = await exa.research.create({
  instructions: "Find the top 5 AI companies by funding in 2024",
  outputSchema: mySchema,
});

// Poll until complete
const result = await exa.research.pollUntilFinished(id, {
  pollInterval: 2000,
  timeoutMs: 5 * 60 * 1000,
});

// Or stream events
const stream = await exa.research.get(id, { stream: true });
for await (const event of stream) {
  console.log(event.eventType, event);
}
```

### Websets API

```js
// Create and manage websets for ongoing data collection
const webset = await exa.websets.create({
  search: {
    query: "AI startups founded in 2024",
    entity: { type: "company" },
    count: 100,
  },
});

// Wait for completion
await exa.websets.waitUntilIdle(webset.id);

// Get items with pagination
for await (const item of exa.websets.items.listAll(webset.id)) {
  console.log(item.properties);
}
```

## Error Handling

```js
import {
  ExaError,
  RateLimitError,
  AuthenticationError,
  TimeoutError,
} from "exa-js";

try {
  const results = await exa.search("query");
} catch (error) {
  if (error instanceof RateLimitError) {
    console.log(`Rate limited. Retry after ${error.retryAfter} seconds`);
  } else if (error instanceof AuthenticationError) {
    console.log("Invalid API key");
  } else if (error instanceof TimeoutError) {
    console.log(`Request timed out after ${error.timeoutMs}ms`);
  } else if (error instanceof ExaError) {
    console.log(`API error: ${error.message} (${error.statusCode})`);
  }
}
```

## API Reference

### `exa.search(query, options?)`

Search the web with AI-powered understanding. Returns text content by default.

### `exa.findSimilar(url, options?)`

Find pages similar to a given URL.

### `exa.getContents(urls, options?)`

Retrieve content for specific URLs.

### `exa.answer(query, options?)`

Get an AI-generated answer with citations.

### `exa.streamAnswer(query, options?)`

Stream an answer in real-time as an async generator.

### `exa.research.create(params)`

Create an autonomous research task.

### `exa.websets.*`

Manage websets for ongoing data collection. See [Websets documentation](https://docs.exa.ai/websets).

## TypeScript Support

This SDK is written in TypeScript and provides full type definitions. Use Zod schemas for type-safe structured outputs:

```typescript
import Exa from "exa-js";
import { z } from "zod";

const exa = new Exa(process.env.EXA_API_KEY);

const CompanySchema = z.object({
  name: z.string(),
  founded: z.number(),
  valuation: z.string(),
});

const result = await exa.answer("Tell me about OpenAI", {
  outputSchema: CompanySchema,
});

// result.answer is typed as { name: string; founded: number; valuation: string }
```

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

## License

[MIT](https://opensource.org/licenses/MIT)
