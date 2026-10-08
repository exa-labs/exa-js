import { randomUUID } from "node:crypto";
import { it, expect } from "vitest";
import { createClient, integrationDescribe } from "./environment";

const FIXTURE_URL = "https://example.com";

/**
 * `livecrawl: "always"` may answer from a crawl made moments earlier for the
 * same URL, so the crawl test asks for a URL no earlier run has fetched.
 */
function uncrawledUrl(): string {
  return `${FIXTURE_URL}/?exa-sdk-livecrawl=${randomUUID()}`;
}

integrationDescribe("Integration: livecrawl", () => {
  it("reports a crawled page when livecrawl is 'always'", async () => {
    const exa = createClient();
    const url = uncrawledUrl();

    const response = await exa.getContents(url, {
      text: true,
      livecrawl: "always",
    });

    expect(response.statuses).toEqual([
      { id: url, status: "success", source: "crawled" },
    ]);
  }, 30_000); // Allow up to 30s since livecrawling can be slow

  it("reports a cached page when livecrawl is 'never'", async () => {
    const exa = createClient();

    const response = await exa.getContents(FIXTURE_URL, {
      text: true,
      livecrawl: "never",
    });

    expect(response.statuses).toHaveLength(1);
    expect(response.statuses![0]).toMatchObject({
      status: "success",
      source: "cached",
    });
    expect(response.results).toHaveLength(1);
  }, 30_000);

  it("forwards the legacy top-level livecrawl option, which the API refuses with maxAgeHours", async () => {
    const exa = createClient();

    await expect(
      exa.searchAndContents("example domain", {
        numResults: 1,
        livecrawl: "always",
        maxAgeHours: 1,
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining(
        "Cannot set both 'livecrawl' and 'maxAgeHours'"
      ),
    });
  }, 30_000);
});
