import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.resetModules();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockImplementation(async (_url: string, options: RequestInit) => {
    const body = JSON.parse(String(options.body));
    return body.stream
      ? new Response("data: [DONE]\n\n", {
          headers: { "content-type": "text/event-stream" },
        })
      : Response.json({ results: [] });
  });
});

afterEach(() => vi.unstubAllGlobals());

describe.each(["search", "searchAndContents", "streamSearch"] as const)(
  "%s objective",
  (method) => {
    it.each([undefined, "Compare GPU providers", ""])(
      "sends optional objective %s without adding a beta header",
      async (objective) => {
        const { default: Exa } = await import("../../src");
        const exa = new Exa("test-key");
        if (method === "streamSearch") {
          for await (const _chunk of exa.streamSearch("H100 pricing", {
            objective,
          })) {
            /* empty stream */
          }
        } else {
          await exa[method]("H100 pricing", { objective });
        }
        const [, options] = fetchMock.mock.calls[0];
        expect(JSON.parse(options.body).objective).toBe(objective);
        expect(new Headers(options.headers).get("Exa-Beta")).toBeNull();
      }
    );
  }
);

it("preserves caller-provided beta headers", async () => {
  const { default: Exa } = await import("../../src");
  const exa = new Exa("test-key");
  await exa.request(
    "/search",
    "POST",
    { query: "q", objective: "goal" },
    undefined,
    {
      "exa-beta": "another-token",
    }
  );
  const [, options] = fetchMock.mock.calls[0];
  expect(new Headers(options.headers).get("Exa-Beta")).toBe("another-token");
});
