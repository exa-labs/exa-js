import { afterEach, describe, expect, it, vi } from "vitest";

async function createClientWithFetch(fetchMock: ReturnType<typeof vi.fn>) {
  vi.resetModules();
  vi.stubGlobal("fetch", fetchMock);
  const { default: Exa } = await import("../../src");
  return new Exa("test-api-key", "https://api.exa.ai");
}

describe("Request error handling", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("wraps non-JSON error responses in ExaError", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("<!DOCTYPE html><html>cloudflare 502</html>", {
        status: 502,
        headers: { "content-type": "text/html" },
      })
    );
    const exa = await createClientWithFetch(fetchMock);

    await expect(exa.search("agent observability")).rejects.toMatchObject({
      name: "ExaError",
      statusCode: 502,
      path: "/search",
      message: expect.stringContaining(
        "Exa API request failed with non-JSON response"
      ),
    });
  });

  it("wraps invalid successful JSON responses in ExaError", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("", {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );
    const exa = await createClientWithFetch(fetchMock);

    await expect(exa.search("agent observability")).rejects.toMatchObject({
      name: "ExaError",
      statusCode: 200,
      path: "/search",
      message: expect.stringContaining("Invalid JSON response from Exa API"),
    });
  });
});
