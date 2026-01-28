# Exa JavaScript SDK

[![npm version](https://img.shields.io/npm/v/exa-js.svg)](https://www.npmjs.com/package/exa-js)

The official JavaScript SDK for [Exa](https://exa.ai), the web search API built for AI.

[Documentation](https://docs.exa.ai) &nbsp;|&nbsp; [Dashboard](https://dashboard.exa.ai)

## Install

```bash
npm install exa-js
```

## Quick Start

```ts
import Exa from "exa-js";

const exa = new Exa(process.env.EXA_API_KEY);

// Search the web
const { results } = await exa.search("best coffee shops in SF");

// Get page contents
const { results } = await exa.getContents(["https://example.com"]);

// Find similar pages
const { results } = await exa.findSimilar("https://example.com");

// Get answers with citations
const { answer } = await exa.answer("What is the capital of France?");
```

## Search

Find webpages using natural language queries.

```ts
const { results } = await exa.search("interesting articles about space", {
  numResults: 10,
  includeDomains: ["nasa.gov", "space.com"],
  startPublishedDate: "2024-01-01",
});
```

## Contents

Get clean text, highlights, or summaries from any URL.

```ts
const { results } = await exa.getContents(["https://example.com"], {
  text: true,
  highlights: true,
  summary: true,
});
```

## Find Similar

Discover pages similar to a given URL.

```ts
const { results } = await exa.findSimilar(
  "https://paulgraham.com/greatwork.html",
  {
    numResults: 10,
    excludeSourceDomain: true,
  }
);
```

## Answer

Get answers to questions with citations from the web.

```ts
const response = await exa.answer("What caused the 2008 financial crisis?");

console.log(response.answer);
console.log(response.citations);
```

## Streaming

Stream answers in real-time.

```ts
for await (const chunk of exa.streamAnswer("Explain quantum computing")) {
  if (chunk.content) {
    process.stdout.write(chunk.content);
  }
}
```

## Research

Run autonomous research tasks that return structured data.

```ts
const { id } = await exa.research.createTask({
  instructions: "Find the top 5 AI startups founded in 2024",
  output: {
    schema: {
      type: "object",
      properties: {
        startups: { type: "array", items: { type: "string" } },
      },
    },
  },
});

const result = await exa.research.pollTask(id);
```

## TypeScript

Full TypeScript support with types for all methods.

```ts
import Exa from "exa-js";
import type { SearchResponse, RegularSearchOptions } from "exa-js";
```

## Links

- [Documentation](https://docs.exa.ai)
- [API Reference](https://docs.exa.ai/reference)
- [Examples](./examples)

## Contributing

Pull requests welcome! For major changes, open an issue first.

## License

[MIT](LICENSE)
