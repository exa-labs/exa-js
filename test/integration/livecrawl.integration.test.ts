import { describe, it, expect } from "vitest";
import Exa from "../../src";

const apiKey = process.env.EXA_API_KEY;

const integrationDescribe = apiKey ? describe : describe.skip;

integrationDescribe("Integration: getContents livecrawl", () => {
  it("should retrieve statuses when livecrawl is set to 'always'", async () => {
    const exa = new Exa(apiKey as string);

    const url = "https://openai.com";

    const response = await exa.getContents(url, {
      text: true,
      livecrawl: "always",
    });

    // Basic assertions – we mainly want to ensure the call succeeds and statuses exist
    expect(response.results.length).toBeGreaterThan(0);
    expect(response.statuses?.length).toBeGreaterThan(0);
  }, 30_000); // Allow up to 30s since livecrawling can be slow
});
