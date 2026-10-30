# Exa JavaScript SDK

[![npm version](https://img.shields.io/npm/v/exa-js.svg)](https://www.npmjs.com/package/exa-js)

The official JavaScript SDK for [Exa](https://exa.ai), the web search API built for AI.

[Documentation](https://exa.ai/docs) &nbsp;|&nbsp; [Dashboard](https://dashboard.exa.ai)

## Install

```bash
npm install exa-js
```

## Quick Start

```ts
import Exa from "exa-js";

const exa = new Exa(process.env.EXA_API_KEY);

// Search the web
const result = await exa.search("blog post about artificial intelligence", {
  type: "auto",
  contents: {
    highlights: true,
  },
});

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
    highlights: true,
  },
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
      sourceCount: { type: "number" },
    },
    required: ["leader", "title"],
  },
});

console.log(resultWithOutput.output?.content);
```

```ts
for await (const chunk of exa.streamSearch("Who leads OpenAI's safety team?", {
  type: "auto",
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

### Raw body fields

Pass `requestOptions.body` as the third argument for per-call search body overrides. Every other method takes it too; see [Request options](#request-options).

```typescript
const result = await exa.search("AI research", undefined, { body: { futureField: true } });
```

## Contents

Get clean text, highlights, or summaries from any URL.

```ts
const { results } = await exa.getContents(["https://exa.ai/docs"], {
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

## Web Search and Contents tools

Use Exa as a `web_search` tool in an OpenAI or Anthropic loop. Call `webSearch()` with no arguments to get Exa's recommended settings for agentic search (`type: "auto"` and `contents: { highlights: true }`).

```ts
import Exa from "exa-js";
import { OpenAI } from "openai";

const exa = new Exa(process.env.EXA_API_KEY);
const openai = new OpenAI();

const messages = [{ role: "user", content: "What's the latest on AI chips?" }];

const completion = await openai.chat.completions.create({
  model: "gpt-5.6",
  messages,
  tools: [exa.openai.webSearch()],
});

const message = completion.choices[0].message;
messages.push(message, ...(await exa.openai.handleToolCalls(message)));
```

```ts
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-5",
  max_tokens: 1024,
  messages,
  tools: [exa.anthropic.webSearch()],
});
```

For the OpenAI Responses API, use `exa.openai.responses.webSearch()` and the same `handleToolCalls` helper.

Pass `name` (and optionally `description`) to rename the tool — for example to run Exa alongside Anthropic's built-in `web_search_20250305` server tool, which reserves the `web_search` name:

```ts
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-5",
  max_tokens: 1024,
  messages,
  tools: [
    { type: "web_search_20250305", name: "web_search", max_uses: 5 },
    exa.anthropic.webSearch({ name: "exa_web_search" }),
  ],
});
```

`getContents()` is available in the same namespaces and lets the model read pages it already has URLs for. It takes a list of URLs and accepts every `exa.getContents` option:

```ts
const completion = await openai.chat.completions.create({
  model: "gpt-5.6",
  messages,
  tools: [
    exa.openai.webSearch(),
    exa.openai.getContents({ summary: true, livecrawl: "preferred" }),
  ],
});
```

## Agent API

```ts
const run = await exa.agent.runs.create({
  query:
    "Find engineering leaders at AI infrastructure companies that raised a Series A or B in the last 6 months.",
  outputSchema: {
    type: "object",
    properties: {
      people: {
        type: "array",
        maxItems: 10,
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            contact_email: { type: "string", format: "email" },
            linkedin_url: { type: "string", format: "uri" },
          },
          required: ["name", "linkedin_url"],
        },
      },
    },
    required: ["people"],
  },
  effort: "auto",
  // Optionally enable Exa Connect data providers for the run.
  dataSources: [{ provider: "financial_datasets" }],
});

const completedRun = await exa.agent.runs.pollUntilFinished(run.id);
console.log(completedRun.output?.structured);
// Per-provider tool-call counts and cost for any Exa Connect data sources used.
console.log(
  completedRun.usage?.dataSources,
  completedRun.costDollars?.dataSources
);
```

For Agent Ultra, set `effort: "ultra"`:

```ts
const ultraRun = await exa.agent.runs.create({
  query:
    "Find all companies building browser automation tools in the United States.",
  effort: "ultra",
  budget: { maxCostDollars: 10 },
});
```

## Agent Monitors (Beta)

Agent Monitors use the beta namespace and require the `AGENT_MONITORS_BETA_HEADER` beta identifier (`agent-monitors-2026-08-04`).

An Agent Monitor keeps a table of entities × fields fresh on a cadence.

```ts
import { AGENT_MONITORS_BETA_HEADER } from "exa-js";

const betas = [AGENT_MONITORS_BETA_HEADER];

// Create a monitor. Creation is async: it returns with status "creating"
// and becomes "active" once the first refresh completes.
const monitor = await exa.beta.agent.monitors.create(
  {
    betas,
    cadence: "7d",
    entities: [
      { name: "Acme Corp", domain: "acme.com" },
      { name: "Globex", domain: "globex.com" },
    ],
    fields: [
      { name: "funding", description: "New funding rounds" },
      { name: "ceo", description: "The company's current CEO" },
    ],
  },
  { idempotencyKey: "my-monitor-1" } // safe retries: same key returns the same monitor
);

// Page the monitor's current entities and their contents.
for await (const {
  entity,
  contents,
} of exa.beta.agent.monitors.entities.listAll(monitor.id, { betas })) {
  console.log(entity.name, contents);
}

// Follow the content change feed (resume later from the page's nextCursor).
const changes = await exa.beta.agent.monitors.changes.list(monitor.id, {
  betas,
  since: "2026-01-01T00:00:00Z",
});

// One-shot backtest of a past news window — no monitor persists.
const backtest = await exa.beta.agent.monitors.backtests.createAndWait({
  betas,
  entities: [{ name: "Acme Corp", domain: "acme.com" }],
  fields: [{ name: "funding", description: "New funding rounds" }],
  startTime: "2026-01-01T00:00:00Z",
  endTime: "2026-01-08T00:00:00Z",
});
console.log(backtest.data);

// Add entities, inspect refresh progress, clean up.
await exa.beta.agent.monitors.entities.add(monitor.id, {
  betas,
  entities: [{ name: "Initech", domain: "initech.com" }],
});
const current = await exa.beta.agent.monitors.get(monitor.id, { betas });
console.log(current.status, current.refresh, current.usage);
await exa.beta.agent.monitors.delete(monitor.id, { betas });
```

## Request options

Every API method takes a request options object as its last argument. It comes after a method's existing arguments, so pass `undefined` for any you skip.

| Option              | Effect                                                      |
| ------------------- | ----------------------------------------------------------- |
| `body`              | Extra fields merged over the JSON request body              |
| `headers`           | Extra request headers                                       |
| `query`             | Extra query parameters                                      |
| `signal`, `timeout` | See [Cancellation and timeouts](#cancellation-and-timeouts) |

```ts
// Send a field the SDK does not type yet.
await exa.getContents(
  "https://example.com",
  { text: true },
  { body: { futureField: true } }
);

await exa.websets.list(
  { limit: 10 },
  {
    query: { futureParam: "value" },
    headers: { "X-Request-Source": "nightly" },
  }
);
```

`body`, `headers` and `query` add to the request the method builds. On a name the method also sets, your value wins.

- `body` is sent with `POST`, `PUT` and `PATCH` requests. Other requests ignore it; use `query` there.
- A header the SDK sets, such as `User-Agent`, is replaced whatever its case. A header set to `null` is removed.
- The method you call decides whether the response streams. `stream` is never taken from `body` or `query`, and a streaming method keeps its `Accept: text/event-stream`: call the streaming method instead.
- Helpers that make several requests (`listAll`, `getAll`, `pollUntilFinished`, `createAndWait`, `waitUntilIdle`) apply the options to each one, so `createAndWait` sends `body` with the create request and not with its polls. A `cursor` in `query` picks the first page of `listAll` and `getAll`; the helper advances from there.
- A CSV import's upload goes to a presigned URL and receives none of the three.
- The LLM tool helpers (`exa.tools`, `exa.openai`, `exa.anthropic`) take no request options argument. A `webSearch` tool passes the `signal` and `timeout` in its config to every search it runs; a `getContents` tool takes neither, and neither tool takes `body`, `headers` or `query`. `run`, `execute` and `handleToolCalls` / `handleToolUse` take no per-call options.

The deprecated `exa.beta.agent.runs` `get`, `cancel`, `stop`, and `delete` take request options in their options object, next to `betas`.

## Cancellation and timeouts

The request options take `signal` to cancel the request and `timeout` in milliseconds. They are never sent in the request body.

```ts
const controller = new AbortController();
const pending = exa.search("latest AI developments", undefined, {
  signal: controller.signal,
});
controller.abort();
await pending; // rejects with ExaAbortError

await exa.getContents(
  "https://example.com",
  { text: true },
  { timeout: 10_000 }
);
await exa.websets.get("ws_123", undefined, { timeout: 10_000 });
await exa.agent.runs.get("run_123", { timeout: 10_000 });
```

Search, contents, and answer also accept `signal` and `timeout` inside their options object; the trailing argument wins when both set the same field.

Set a default timeout for every request on the client; a per-call `timeout` overrides it. Without one, the SDK applies no timeout of its own.

```ts
const exa = new Exa(process.env.EXA_API_KEY, undefined, { timeout: 30_000 });
```

`timeout` is a positive integer up to 2,147,483,647 ms and applies to each HTTP request:

- A regular call must finish, response body included, within the timeout.
- A streaming call (`streamSearch`, `streamAnswer`, `stream: true`) must start within the timeout. Once the stream is flowing the timeout no longer applies; use `signal` to stop it.
- Helpers that make several requests (`listAll`, `getAll`, `pollUntilFinished`, `createAndWait`, `waitUntilIdle`) apply it to each one. Aborting the signal also ends the wait between polls.

Both failures have their own error class: `ExaTimeoutError` (`name` `"TimeoutError"`) when `timeout` expires, and `ExaAbortError` (`name` `"AbortError"`) when your `signal` aborts, whatever its reason, `AbortSignal.timeout()` included.

```ts
import { ExaAbortError, ExaTimeoutError } from "exa-js";

try {
  await exa.search("latest AI developments", undefined, { timeout: 5_000 });
} catch (error) {
  if (error instanceof ExaTimeoutError) {
    // An ExaError with statusCode 408; error.timeout is the limit in ms.
  } else if (error instanceof ExaAbortError) {
    // The caller's signal aborted; error.cause is the underlying reason.
  }
}
```

`request` / `rawRequest` take the same options as their sixth argument. With `rawRequest`, the timeout keeps running until the response body is consumed or cancelled, so do one or the other when finished. Keeping only a body reader or a cloned response does not end cancellation or timeout coverage, and an interrupted body read rejects with the platform's own error. Request timers and signal listeners are released when the body settles.

## Warnings

The API can return `warnings` about a request, such as a field it ignores. At the time of writing, search responses carry them, including `streamSearch`. A warning never changes the status code or the results. It is for whoever maintains the code that builds the request. Fix the request, and don't pass the warning to a model. The response keeps them in `warnings`.

By default the client prints each one with `console.warn`, once per process for each endpoint, code and path:

```text
[exa] POST /search IGNORED_FIELD at /startCrawlDate: startCrawlDate is no longer supported and is ignored. Remove it from the request.
```

The client's `warnings` option changes that. `"silent"` prints nothing. A function receives every warning, with the request it is about, instead of printing:

```ts
const quiet = new Exa(process.env.EXA_API_KEY, undefined, { warnings: "silent" });

const routed = new Exa(process.env.EXA_API_KEY, undefined, {
  warnings: (warning, { endpoint, method, requestId }) => {
    logger.warn({ ...warning, endpoint, method, requestId }, "Exa API warning");
  },
});
```

The handler's types are `ApiWarning` (`code`, `path` and `message`) and `ApiWarningContext`. Options the API ignores are marked `@deprecated` in the types, so editors flag them before the request is sent. At the time of writing, `useAutoprompt` is one of them.

## TypeScript

Full TypeScript support with types for all methods.

```ts
import Exa from "exa-js";
import type { SearchResponse, RegularSearchOptions } from "exa-js";
```

## Links

- [Documentation](https://exa.ai/docs)
- [API Reference](https://exa.ai/docs/reference/search)

## Contributing

Pull requests welcome! For major changes, open an issue first.

## License

[MIT](LICENSE).
