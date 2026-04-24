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
const result = await exa.search(
  "blog post about artificial intelligence",
  {
    type: "auto",
    contents: {
      highlights: true
    }
  }
);

// Get answers with citations
const { answer } = await exa.answer("What is the capital of France?");
```

## Search

Find webpages using natural language queries.

```ts
const result = await exa.search("interesting articles about space", {
  numResults: 10,
  includeDomains: ["nasa.gov", "space.com"],
  startPublishedDate: "2024-01-01",
  contents: {
    highlights: true
  }
});
```

```ts
const resultWithOutput = await exa.search("Who leads OpenAI's safety team?", {
  type: "auto",
  systemPrompt: "Prefer official sources and avoid duplicate results",
  outputSchema: {
    type: "object",
    properties: {
      leader: { type: "string" },
      title: { type: "string" },
      sourceCount: { type: "number" }
    },
    required: ["leader", "title"]
  }
});

console.log(resultWithOutput.output?.content);
```

```ts
for await (const chunk of exa.streamSearch("Who leads OpenAI's safety team?", {
  type: "auto"
})) {
  if (chunk.content) {
    process.stdout.write(chunk.content);
  }
}
```

Search `outputSchema` modes:
- `type: "text"`: return plain text in `output.content` (optionally guided by `description`)
- `type: "object"`: return structured JSON in `output.content`

`systemPrompt` and `outputSchema` are supported on every search type.
Search streaming is available via `streamSearch(...)`, which yields OpenAI-style chat completion chunks.

For `type: "object"`, search currently enforces:
- max nesting depth: `2`
- max total properties: `10`

Deep search variants that also support `additionalQueries`:
- `deep-lite`
- `deep`
- `deep-reasoning`

## Contents

Get clean text, full text, highlights, or summaries from any URL. Add `query` inside `text` to return focused excerpts instead of truncated full page text.

```ts
const { results } = await exa.getContents(["https://docs.exa.ai"], {
  text: true,
  highlights: true,
  summary: true,
});
```

## Answer

```ts
const response = await exa.answer("What caused the 2008 financial crisis?");
console.log(response.answer);
```

```ts
for await (const chunk of exa.streamAnswer("Explain quantum computing")) {
  if (chunk.content) {
    process.stdout.write(chunk.content);
  }
}
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
