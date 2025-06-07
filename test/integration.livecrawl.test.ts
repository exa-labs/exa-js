import { describe, it, expect } from "vitest";
import Exa from "../src";

// Prefer EXASEARCH_API_KEY (SDK default), but also allow EXA_API_KEY for convenience
const apiKey = process.env.EXASEARCH_API_KEY || process.env.EXA_API_KEY;

// If no key is provided, skip this integration suite to avoid failures in CI
const integrationDescribe = apiKey ? describe : describe.skip;

integrationDescribe("Integration: getContents livecrawl", () => {
  it(
    "should retrieve statuses when livecrawl is set to 'always'",
    async () => {
      const exa = new Exa(apiKey as string);

      const url = "https://openai.com"; // Simple, well-behaved URL

      const response = await exa.getContents(url, {
        text: true,
        livecrawl: "always",
      });

      console.log(response);

      // Basic assertions – we mainly want to ensure the call succeeds and statuses exist
      expect(response.results.length).toBeGreaterThan(0);
      expect(response.statuses?.length).toBeGreaterThan(0);
    },
    30_000 // Allow up to 30s since livecrawling can be slow
  );
}); 