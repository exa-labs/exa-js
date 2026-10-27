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

  it("sends date summary fields as date-time strings", async () => {
    const requestSpy = vi
      .spyOn(exa, "request")
      .mockResolvedValue(emptyResponse);

    await exa.getContents("https://example.com", {
      summary: { schema: z.object({ publishedAt: z.date() }) },
    });

    expect(requestSpy.mock.calls[0][2]).toMatchObject({
      summary: {
        schema: {
          properties: { publishedAt: { type: "string", format: "date-time" } },
        },
      },
    });
  });

  it("sends set and map summary fields as constrained arrays", async () => {
    const requestSpy = vi
      .spyOn(exa, "request")
      .mockResolvedValue(emptyResponse);

    await exa.getContents("https://example.com", {
      summary: {
        schema: z.object({
          tags: z.set(z.string()).min(1).max(2),
          pair: z.set(z.string()).size(2),
          scores: z.map(z.string(), z.number()),
        }),
      },
    });

    expect(requestSpy.mock.calls[0][2]).toMatchObject({
      summary: {
        schema: {
          properties: {
            tags: {
              type: "array",
              uniqueItems: true,
              items: { type: "string" },
              minItems: 1,
              maxItems: 2,
            },
            pair: {
              type: "array",
              uniqueItems: true,
              items: { type: "string" },
              minItems: 2,
              maxItems: 2,
            },
            scores: {
              type: "array",
              maxItems: 125,
              items: {
                type: "array",
                items: [{ type: "string" }, { type: "number" }],
                minItems: 2,
                maxItems: 2,
              },
            },
          },
        },
      },
    });
  });

  it("retains pipeline constraints and input schemas for transforms and defaults", async () => {
    const requestSpy = vi
      .spyOn(exa, "request")
      .mockResolvedValue(emptyResponse);

    await exa.getContents("https://example.com", {
      summary: {
        schema: z.object({
          title: z.string().pipe(z.string().min(3)),
          length: z.string().transform((value) => value.length),
          label: z.string().default("untitled"),
        }),
      },
    });

    expect(requestSpy.mock.calls[0][2]).toMatchObject({
      summary: {
        schema: {
          properties: {
            title: {
              allOf: [{ type: "string" }, { type: "string", minLength: 3 }],
            },
            length: { type: "string" },
            label: { type: "string", default: "untitled" },
          },
          required: ["title", "length"],
        },
      },
    });
  });

  it.each([
    ["strip", z.object({ title: z.string() }).strip(), false],
    ["strict", z.object({ title: z.string() }).strict(), false],
    ["passthrough", z.object({ title: z.string() }).passthrough(), true],
    [
      "catchall",
      z.object({ title: z.string() }).catchall(z.number()),
      { type: "number" },
    ],
  ])(
    "preserves additional properties for %s summary objects",
    async (_, schema, additionalProperties) => {
      const requestSpy = vi
        .spyOn(exa, "request")
        .mockResolvedValue(emptyResponse);

      await exa.getContents("https://example.com", {
        summary: { schema },
      });

      expect(requestSpy.mock.calls[0][2]).toMatchObject({
        summary: { schema: { additionalProperties } },
      });
    }
  );

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
