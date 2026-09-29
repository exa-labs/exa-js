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
