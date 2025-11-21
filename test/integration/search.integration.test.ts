import { describe, it, expect } from "vitest";
import Exa from "../../src";

const exa = new Exa(process.env.EXA_API_KEY);

describe("Search Contents Options", () => {
  const testQuery = "invasive ant species California";

  it("Defaults to providing text contents with 10,000 max characters", async () => {
    const response = await exa.search(testQuery);
    expect(response.results).not.toHaveLength(0);

    const sampleResult = response.results[0];
    expect(sampleResult.text).toBeDefined();
    expect(sampleResult.text.length).toBeGreaterThan(1_000);
    expect(sampleResult.text.length).toBeLessThanOrEqual(10_000);
  });

  it("Returns no contents when explicitly set to false", async () => {
    const response = await exa.search(testQuery, {
      contents: false,
      numResults: 2,
    });
    expect(response.results).not.toHaveLength(0);

    const sampleResult = response.results[0];
    expect("text" in sampleResult).toBeFalsy();
    expect("summary" in sampleResult).toBeFalsy();
  });

  it("Returns text contents when explicitly requested", async () => {
    const response = await exa.search(testQuery, {
      contents: { text: true },
      numResults: 2,
    });
    expect(response.results).not.toHaveLength(0);

    const sampleResult = response.results[0];
    expect(sampleResult.text).toBeDefined();
    expect(sampleResult.text.length).toBeGreaterThan(100);
  });

  it("Returns text contents with custom maxCharacters", async () => {
    const maxChars = 500;
    const response = await exa.search(testQuery, {
      contents: { text: { maxCharacters: maxChars } },
      numResults: 2,
    });
    expect(response.results).not.toHaveLength(0);

    const sampleResult = response.results[0];
    expect(sampleResult.text).toBeDefined();
    expect(sampleResult.text.length).toBeLessThanOrEqual(maxChars);
  });

  it("Returns summary when requested", async () => {
    const response = await exa.search(testQuery, {
      contents: { summary: true },
      numResults: 2,
    });
    expect(response.results).not.toHaveLength(0);

    const sampleResult = response.results[0];
    expect(sampleResult.summary).toBeDefined();
    expect(sampleResult.summary.length).toBeGreaterThan(10);
    expect("text" in sampleResult).toBeFalsy();
  }, 15000);

  it("Returns both text and summary when both are requested", async () => {
    const response = await exa.search(testQuery, {
      contents: {
        text: { maxCharacters: 1000 },
        summary: true,
      },
      numResults: 2,
    });
    expect(response.results).not.toHaveLength(0);

    const sampleResult = response.results[0];
    expect(sampleResult.text).toBeDefined();
    expect(sampleResult.text.length).toBeGreaterThan(100);
    expect(sampleResult.text.length).toBeLessThanOrEqual(1000);
    expect(sampleResult.summary).toBeDefined();
    expect(sampleResult.summary.length).toBeGreaterThan(10);
  }, 20000);

  it("Returns summary with custom query", async () => {
    const response = await exa.search(testQuery, {
      contents: {
        text: { maxCharacters: 100 },
        summary: { query: "What is the name of the species?" },
      },
      numResults: 2,
    });
    expect(response.results).not.toHaveLength(0);

    const sampleResult = response.results[0];
    expect(sampleResult.summary).toBeDefined();
    expect(sampleResult.summary.length).toBeGreaterThan(10);
  }, 15000);

  it("Defaults to text when passing other search options without contents", async () => {
    const response = await exa.search(testQuery, {
      numResults: 3,
      type: "fast",
    });
    expect(response.results).toHaveLength(3);

    const sampleResult = response.results[0];
    expect(sampleResult.text).toBeDefined();
    expect(sampleResult.text.length).toBeGreaterThan(100);
  });
});

describe("Deep Search", () => {
  it("should always return context for deep search", async () => {
    const response = await exa.search("latest quantum computing developments", {
      type: "deep",
      numResults: 3,
    });

    // Deep search should always return context
    expect(response.context).toBeDefined();
    expect(response.context).not.toBeNull();
    expect(typeof response.context).toBe("string");
    expect(response.context?.length).toBeGreaterThan(0);

    // Should also return results
    expect(response.results).not.toHaveLength(0);
    expect(response.results.length).toBeGreaterThan(0);
  }, 30000); // Deep search can take longer
});
