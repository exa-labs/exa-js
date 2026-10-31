import { assert, test, vi } from "vitest";
import Exa from "../../src";

test("simple", () => {
  assert.equal("foo", "foo");
});

test("getContents exposes status error details", async () => {
  const exa = new Exa("test-api-key");
  vi.spyOn(exa, "request").mockResolvedValueOnce({
    statuses: [
      {
        id: "https://a.com",
        status: "error",
        error: { httpStatusCode: 404, tag: "CRAWL_NOT_FOUND" },
      },
    ],
    results: [],
  });

  const response = await exa.getContents(["https://a.com"], { text: true });

  assert.equal(response.statuses?.[0].error?.tag, "CRAWL_NOT_FOUND");
  assert.equal(response.statuses?.[0].error?.httpStatusCode, 404);
});

// Reading a subpage's `url`, `title` and `id` compiles only when the subpage
// type has the result fields, which `tsc --noEmit` checks.
test("getContents types each subpage as a result with the requested contents", async () => {
  const exa = new Exa("test-api-key");
  vi.spyOn(exa, "request").mockResolvedValueOnce({
    results: [
      {
        id: "https://a.com",
        url: "https://a.com",
        title: "A",
        text: "Home",
        subpages: [
          {
            id: "https://a.com/about",
            url: "https://a.com/about",
            title: "About",
            text: "About us",
          },
        ],
      },
    ],
  });

  const response = await exa.getContents(["https://a.com"], {
    text: true,
    subpages: 1,
  });
  const subpage = response.results[0].subpages[0];

  assert.equal(subpage.url, "https://a.com/about");
  assert.equal(subpage.title, "About");
  assert.equal(subpage.id, "https://a.com/about");
  assert.equal(subpage.text, "About us");
});
