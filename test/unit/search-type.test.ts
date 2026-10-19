/**
 * Tests for the search `type` option. The known search types keep their
 * literals for autocomplete and keep the option set each one allows, and any
 * other string compiles and reaches the API unchanged.
 *
 * The type-level checks are the `expectTypeOf` assertions and the
 * `@ts-expect-error` lines, which `tsc --noEmit` enforces. No real HTTP:
 * `request` and `rawRequest` are stubbed.
 */
import { beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import Exa, { type DeepSearchType, type RegularSearchOptions } from "../../src";

type KnownSearchType =
  | DeepSearchType
  | "keyword"
  | "neural"
  | "auto"
  | "hybrid"
  | "fast"
  | "instant"
  | "lite";

// Exclude, not NonNullable: `NonNullable` intersects with `{}`, which turns
// `string & {}` into `string` and absorbs the literals.
type SearchTypeOption = Exclude<RegularSearchOptions["type"], undefined>;
// streamSearch infers its `Type` parameter from the `type` a caller passes.
// With its default, `never`, only the listed search types remain.
type StreamSearchTypeOption = Exclude<
  Exclude<
    Parameters<typeof Exa.prototype.streamSearch<never>>[1],
    undefined
  >["type"],
  undefined
>;

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

describe("search type", () => {
  let exa: Exa;

  beforeEach(() => {
    vi.resetAllMocks();
    exa = new Exa("test-api-key", "https://api.exa.ai");
  });

  it("keeps every known search type as a literal for autocomplete", () => {
    expectTypeOf<
      Extract<SearchTypeOption, KnownSearchType>
    >().toEqualTypeOf<KnownSearchType>();
    expectTypeOf<
      Extract<StreamSearchTypeOption, KnownSearchType>
    >().toEqualTypeOf<Exclude<KnownSearchType, "lite">>();
  });

  it("accepts any other search type string", () => {
    expectTypeOf<"future-type">().toMatchTypeOf<SearchTypeOption>();
    expectTypeOf<string>().toMatchTypeOf<SearchTypeOption>();
  });

  it("passes an unknown search type through to search", async () => {
    const requestSpy = vi
      .spyOn(exa, "request")
      .mockResolvedValue({ results: [], requestId: "req-future" });

    await exa.search("q", { type: "future-type", numResults: 3 });
    await exa.search("q", {
      type: "future-type",
      contents: { highlights: true },
    });

    expect(requestSpy).toHaveBeenNthCalledWith(1, "/search", "POST", {
      query: "q",
      type: "future-type",
      numResults: 3,
      contents: { text: { maxCharacters: 10000 } },
    });
    expect(requestSpy).toHaveBeenNthCalledWith(2, "/search", "POST", {
      query: "q",
      type: "future-type",
      contents: { highlights: true },
    });
  });

  it("passes an unknown search type through to streamSearch", async () => {
    const rawRequestSpy = vi
      .spyOn(exa, "rawRequest")
      .mockResolvedValueOnce(
        createSseResponse(['data: {"choices":[{"delta":{"content":"Hi"}}]}'])
      );

    for await (const _chunk of exa.streamSearch("q", { type: "future-type" })) {
      // Drain the stream so the request is sent.
    }

    expect(rawRequestSpy).toHaveBeenCalledWith("/search", "POST", {
      query: "q",
      type: "future-type",
      contents: { text: { maxCharacters: 10000 } },
      stream: true,
    });
  });

  it("keeps the deep option set for the deep search types", () => {
    vi.spyOn(exa, "request").mockResolvedValue({ results: [] });

    exa.search("q", { type: "deep", additionalQueries: ["a"] });
    exa.search("q", { type: "deep-reasoning", additionalQueries: ["a"] });
    exa.streamSearch("q", { type: "deep", additionalQueries: ["a"] });
  });

  it("keeps rejecting deep-only options on the other search types", () => {
    vi.spyOn(exa, "request").mockResolvedValue({ results: [] });

    // @ts-expect-error additionalQueries is only for deep search types
    exa.search("q", { type: "auto", additionalQueries: ["a"] });
    // @ts-expect-error additionalQueries is only for deep search types
    exa.search("q", { type: "lite", additionalQueries: ["a"] });
    // @ts-expect-error additionalQueries is only for deep search types
    exa.search("q", { additionalQueries: ["a"] });
    // @ts-expect-error an unknown search type gets the non-deep option set
    exa.search("q", { type: "future-type", additionalQueries: ["a"] });
    // @ts-expect-error additionalQueries is only for deep search types
    exa.streamSearch("q", { type: "auto", additionalQueries: ["a"] });
  });

  it("keeps rejecting lite in streamSearch", () => {
    // @ts-expect-error lite does not support streaming
    exa.streamSearch("q", { type: "lite" });
    exa.streamSearch("q", { type: "auto" });
    exa.streamSearch("q", {});
    exa.streamSearch("q");
  });

  it("accepts an unknown search type in the web_search tool config", () => {
    expect(exa.openai.webSearch({ type: "future-type" }).name).toBe(
      "web_search"
    );
    expect(exa.anthropic.webSearch({ type: "future-type" }).name).toBe(
      "web_search"
    );
  });
});
