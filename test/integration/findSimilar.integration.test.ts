import { describe, it, expect } from "vitest";
import Exa from "../../src";

const exa = new Exa(process.env.EXA_API_KEY);

describe("FindSimilar Contents Options", () => {
  const testUrl = "https://en.wikipedia.org/wiki/Ant";

  it("Defaults to providing text contents with 10,000 max characters", async () => {
    const response = await exa.findSimilar(testUrl, { numResults: 2 });
    expect(response.results).not.toHaveLength(0);

    const sampleResult = response.results[0];
    expect(sampleResult.text).toBeDefined();
    expect(sampleResult.text.length).toBeGreaterThan(1_000);
    expect(sampleResult.text.length).toBeLessThanOrEqual(10_000);
  });

  it("Returns no contents when explicitly set to false", async () => {
    const response = await exa.findSimilar(testUrl, {
      contents: false,
      numResults: 2,
    });
    expect(response.results).not.toHaveLength(0);

    const sampleResult = response.results[0];
    expect((sampleResult as Record<string, unknown>).text).toBeUndefined();
    expect((sampleResult as Record<string, unknown>).summary).toBeUndefined();
  });

  it("Returns text contents when explicitly requested", async () => {
    const response = await exa.findSimilar(testUrl, {
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
    const response = await exa.findSimilar(testUrl, {
      contents: { text: { maxCharacters: maxChars } },
      numResults: 2,
    });
    expect(response.results).not.toHaveLength(0);

    const sampleResult = response.results[0];
    expect(sampleResult.text).toBeDefined();
    expect(sampleResult.text.length).toBeLessThanOrEqual(maxChars);
  });

  it("Returns summary when requested", async () => {
    const response = await exa.findSimilar(testUrl, {
      contents: { summary: true },
      numResults: 2,
    });
    expect(response.results).not.toHaveLength(0);

    const sampleResult = response.results[0];
    expect(sampleResult.summary).toBeDefined();
    expect(sampleResult.summary.length).toBeGreaterThan(10);
    expect((sampleResult as Record<string, unknown>).text).toBeUndefined();
  }, 15000);

  it("Returns both text and summary when both are requested", async () => {
    const response = await exa.findSimilar(testUrl, {
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

  it("Defaults to text when passing other options without contents", async () => {
    const response = await exa.findSimilar(testUrl, {
      numResults: 3,
      excludeSourceDomain: true,
    });
    expect(response.results).toHaveLength(3);

    const sampleResult = response.results[0];
    expect(sampleResult.text).toBeDefined();
    expect(sampleResult.text.length).toBeGreaterThan(100);
  });
});

