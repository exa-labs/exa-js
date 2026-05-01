import { describe, it, expect } from "vitest";
import Exa from "../../src";

const exa = new Exa(process.env.EXA_API_KEY);

describe("Deprecated findSimilar contents compatibility", () => {
  const testUrl = "https://en.wikipedia.org/wiki/Ant";

  it("preserves deprecated default text contents with 10,000 max characters", async () => {
    // DEPRECATED METHOD: compatibility coverage for legacy URL-similarity behavior.
    const response = await exa.findSimilar(testUrl, { numResults: 2 });
    expect(response.results).not.toHaveLength(0);

    const sampleResult = response.results[0];
    expect(sampleResult.text).toBeDefined();
    expect(sampleResult.text.length).toBeGreaterThan(1_000);
    expect(sampleResult.text.length).toBeLessThanOrEqual(10_000);
  });

  it("preserves deprecated no-contents option when explicitly set to false", async () => {
    // DEPRECATED METHOD: compatibility coverage for legacy URL-similarity behavior.
    const response = await exa.findSimilar(testUrl, {
      contents: false,
      numResults: 2,
    });
    expect(response.results).not.toHaveLength(0);

    const sampleResult = response.results[0];
    expect(sampleResult.text).toBeUndefined();
    expect(sampleResult.summary).toBeUndefined();
  });

  it("preserves deprecated text contents when explicitly requested", async () => {
    // DEPRECATED METHOD: compatibility coverage for legacy URL-similarity behavior.
    const response = await exa.findSimilar(testUrl, {
      contents: { text: true },
      numResults: 2,
    });
    expect(response.results).not.toHaveLength(0);

    const sampleResult = response.results[0];
    expect(sampleResult.text).toBeDefined();
    expect(sampleResult.text.length).toBeGreaterThan(100);
  });

  it("preserves deprecated text contents with custom maxCharacters", async () => {
    const maxChars = 500;
    // DEPRECATED METHOD: compatibility coverage for legacy URL-similarity behavior.
    const response = await exa.findSimilar(testUrl, {
      contents: { text: { maxCharacters: maxChars } },
      numResults: 2,
    });
    expect(response.results).not.toHaveLength(0);

    const sampleResult = response.results[0];
    expect(sampleResult.text).toBeDefined();
    expect(sampleResult.text.length).toBeLessThanOrEqual(maxChars);
  });

  it("preserves deprecated summary contents when requested", async () => {
    // DEPRECATED METHOD: compatibility coverage for legacy URL-similarity behavior.
    const response = await exa.findSimilar(testUrl, {
      contents: { summary: true },
      numResults: 2,
    });
    expect(response.results).not.toHaveLength(0);

    const sampleResult = response.results[0];
    expect(sampleResult.summary).toBeDefined();
    expect(sampleResult.summary.length).toBeGreaterThan(10);
    expect(sampleResult.text).toBeUndefined();
  }, 15000);

  it("preserves deprecated text and summary contents when both are requested", async () => {
    // DEPRECATED METHOD: compatibility coverage for legacy URL-similarity behavior.
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

  it("preserves deprecated default text when passing other options without contents", async () => {
    // DEPRECATED METHOD: compatibility coverage for legacy URL-similarity behavior.
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
