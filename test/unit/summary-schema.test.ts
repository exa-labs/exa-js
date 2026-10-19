/**
 * Every method that takes contents options sends a Zod `summary.schema` to
 * the API as JSON Schema.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import Exa, { type ContentsOptions } from "../../src";
import { zodToJsonSchema } from "../../src/zod-utils";

const summarySchema = z.object({
  headline: z.string(),
  score: z.number(),
});
const jsonSummarySchema = zodToJsonSchema(summarySchema);
const zodSummary: ContentsOptions = {
  summary: { query: "Key facts", schema: summarySchema },
};
const jsonSummary = {
  summary: { query: "Key facts", schema: jsonSummarySchema },
};
const emptyResponse = { results: [], requestId: "req-1" };

describe("Zod summary schemas", () => {
  let exa: Exa;

  beforeEach(() => {
    vi.restoreAllMocks();
    exa = new Exa("test-api-key", "https://api.exa.ai");
  });

  it("converts the schema to JSON Schema", () => {
    expect(jsonSummarySchema).toMatchObject({
      type: "object",
      properties: { headline: { type: "string" }, score: { type: "number" } },
    });
  });

  it("search() sends contents.summary.schema as JSON Schema", async () => {
    const requestSpy = vi
      .spyOn(exa, "request")
      .mockResolvedValueOnce(emptyResponse);

    await exa.search("ai news", { contents: zodSummary });

    expect(requestSpy).toHaveBeenCalledWith("/search", "POST", {
      query: "ai news",
      contents: jsonSummary,
    });
  });

  it("getContents() sends summary.schema as JSON Schema", async () => {
    const requestSpy = vi
      .spyOn(exa, "request")
      .mockResolvedValueOnce(emptyResponse);

    await exa.getContents(["https://example.com"], zodSummary);

    expect(requestSpy).toHaveBeenCalledWith("/contents", "POST", {
      urls: ["https://example.com"],
      ...jsonSummary,
    });
  });

  it("findSimilar() sends contents.summary.schema as JSON Schema", async () => {
    const requestSpy = vi
      .spyOn(exa, "request")
      .mockResolvedValueOnce(emptyResponse);

    await exa.findSimilar("https://example.com", { contents: zodSummary });

    expect(requestSpy.mock.calls[0][2]).toEqual({
      url: "https://example.com",
      contents: jsonSummary,
    });
  });

  it("searchAndContents() sends summary.schema as JSON Schema", async () => {
    const requestSpy = vi
      .spyOn(exa, "request")
      .mockResolvedValueOnce(emptyResponse);

    await exa.searchAndContents("ai news", zodSummary);

    expect(requestSpy).toHaveBeenCalledWith("/search", "POST", {
      query: "ai news",
      contents: jsonSummary,
    });
  });

  it("leaves a JSON Schema summary.schema unchanged", async () => {
    const requestSpy = vi
      .spyOn(exa, "request")
      .mockResolvedValueOnce(emptyResponse);

    await exa.getContents("https://example.com", jsonSummary);

    expect(requestSpy.mock.calls[0][2]).toEqual({
      urls: ["https://example.com"],
      ...jsonSummary,
    });
  });
});
