/**
 * Offline tests for the `warnings` array on `/search` responses and streams.
 * No real HTTP: `request` and `rawRequest` are stubbed.
 */
import { beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import Exa, {
  type AnswerStreamChunk,
  type SearchResponse,
  type SearchStreamChunk,
  type SearchWarning,
  type SearchWarningCode,
} from "../../src";

const IGNORED_START: SearchWarning = {
  code: "IGNORED_FIELD",
  path: "/startCrawlDate",
  message:
    "startCrawlDate is no longer supported and is ignored. Remove it from the request.",
};

const IGNORED_END: SearchWarning = {
  code: "IGNORED_FIELD",
  path: "/endCrawlDate",
  message:
    "endCrawlDate is no longer supported and is ignored. Remove it from the request.",
};

function createSseResponse(lines: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const line of lines) {
        controller.enqueue(encoder.encode(`${line}\n`));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: { "content-type": "text/event-stream" },
  });
}

/** The SSE payloads `/search` streams: text deltas, one `results` event, then `done`. */
function searchStreamLines(warnings?: SearchWarning[]): string[] {
  const results: Record<string, unknown> = {
    requestId: "req-1",
    type: "results",
    results: [{ url: "https://example.com", id: "1", title: "Example" }],
  };
  if (warnings) {
    results.warnings = warnings;
  }
  return [
    `data: ${JSON.stringify({
      requestId: "req-1",
      type: "text-delta",
      delta: "Hello",
      choices: [
        {
          index: 0,
          delta: { role: "assistant", content: "Hello" },
          finish_reason: null,
        },
      ],
    })}`,
    "",
    `data: ${JSON.stringify(results)}`,
    "",
    `data: ${JSON.stringify({
      requestId: "req-1",
      type: "done",
      output: null,
      searchTime: 12.5,
      choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
    })}`,
    "",
    "data: [DONE]",
  ];
}

describe("search warnings", () => {
  let exa: Exa;

  beforeEach(() => {
    vi.resetAllMocks();
    exa = new Exa("test-api-key", "https://api.exa.ai");
  });

  it("types warnings on the search response", () => {
    expectTypeOf<SearchResponse<{}>["warnings"]>().toEqualTypeOf<
      SearchWarning[] | undefined
    >();
    expectTypeOf<SearchWarning>().toEqualTypeOf<{
      code: SearchWarningCode;
      path: string;
      message: string;
    }>();
    expectTypeOf<"IGNORED_FIELD">().toMatchTypeOf<SearchWarningCode>();
    expectTypeOf<"SOME_FUTURE_CODE">().toMatchTypeOf<SearchWarningCode>();
    expectTypeOf<SearchStreamChunk["warnings"]>().toEqualTypeOf<
      SearchWarning[] | undefined
    >();
    expectTypeOf<SearchStreamChunk>().toMatchTypeOf<AnswerStreamChunk>();
  });

  it("returns the warnings search receives", async () => {
    vi.spyOn(exa, "request").mockResolvedValueOnce({
      requestId: "req-1",
      results: [{ url: "https://example.com", id: "1", title: "Example" }],
      warnings: [IGNORED_START, IGNORED_END],
    });

    const result = await exa.search("rust release notes", {
      startCrawlDate: "2026-01-01",
    });

    const warnings: SearchWarning[] | undefined = result.warnings;
    expect(warnings).toEqual([IGNORED_START, IGNORED_END]);
  });

  it("leaves warnings undefined when the response has none", async () => {
    vi.spyOn(exa, "request").mockResolvedValueOnce({
      requestId: "req-1",
      results: [],
    });

    const result = await exa.search("rust release notes");

    expect(result.warnings).toBeUndefined();
  });

  it("yields the stream's warnings on a chunk of their own", async () => {
    vi.spyOn(exa, "rawRequest").mockResolvedValueOnce(
      createSseResponse(searchStreamLines([IGNORED_START]))
    );

    const chunks: SearchStreamChunk[] = [];
    for await (const chunk of exa.streamSearch("rust release notes", {
      type: "auto",
    })) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual([
      { content: "Hello", citations: undefined },
      { content: undefined, citations: undefined, warnings: [IGNORED_START] },
    ]);
  });

  it("yields only text when the stream carries no warnings", async () => {
    vi.spyOn(exa, "rawRequest").mockResolvedValueOnce(
      createSseResponse(searchStreamLines())
    );

    const chunks: SearchStreamChunk[] = [];
    for await (const chunk of exa.streamSearch("rust release notes")) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual([{ content: "Hello", citations: undefined }]);
    expect(chunks[0]).not.toHaveProperty("warnings");
  });

  it("skips an empty warnings array in the stream", async () => {
    vi.spyOn(exa, "rawRequest").mockResolvedValueOnce(
      createSseResponse(searchStreamLines([]))
    );

    const chunks: SearchStreamChunk[] = [];
    for await (const chunk of exa.streamSearch("rust release notes")) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual([{ content: "Hello", citations: undefined }]);
  });
});
