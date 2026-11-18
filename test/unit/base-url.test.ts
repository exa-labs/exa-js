/**
 * The base URL a client sends its requests to. Runs against local HTTP
 * servers, so each test sees which server every request reached, at which
 * path and with which `x-api-key`.
 */
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";
import Exa from "../../src";

const EU_BASE_URL = "https://api.eu.exa.ai";
const servers: Server[] = [];

/**
 * Answers every request with an empty search response on a loopback port and
 * records the path and `x-api-key` of each request that reaches it.
 */
async function startServer(): Promise<{
  baseURL: string;
  received: Array<[string, string | undefined]>;
}> {
  const received: Array<[string, string | undefined]> = [];
  const server = createServer((request, response) => {
    const apiKey = request.headers["x-api-key"];
    received.push([
      request.url ?? "",
      Array.isArray(apiKey) ? apiKey.join(",") : apiKey,
    ]);
    request.resume();
    request.on("end", () => {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify({ requestId: "req-1", results: [], data: [], hasMore: false })
      );
    });
  });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return { baseURL: `http://127.0.0.1:${port}`, received };
}

/** The base URL a client sends its requests to. */
function baseURLOf(exa: Exa): string {
  return (exa as unknown as { baseURL: string }).baseURL;
}

afterEach(async () => {
  vi.unstubAllEnvs();
  for (const server of servers.splice(0)) {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
});

describe("the client's base URL", () => {
  it("defaults to the public API", () => {
    vi.stubEnv("EXA_BASE_URL", undefined);

    expect(baseURLOf(new Exa("test-key"))).toBe("https://api.exa.ai");
  });

  it("comes from EXA_BASE_URL when the constructor is given none", () => {
    vi.stubEnv("EXA_BASE_URL", EU_BASE_URL);

    expect(baseURLOf(new Exa("test-key"))).toBe(EU_BASE_URL);
  });

  it("ignores a blank EXA_BASE_URL", () => {
    vi.stubEnv("EXA_BASE_URL", "  ");

    expect(baseURLOf(new Exa("test-key"))).toBe("https://api.exa.ai");
  });

  it("prefers the constructor's baseURL to EXA_BASE_URL", () => {
    vi.stubEnv("EXA_BASE_URL", "https://api.exa.ai");

    expect(baseURLOf(new Exa("test-key", EU_BASE_URL))).toBe(EU_BASE_URL);
  });

  it("drops trailing slashes", () => {
    vi.stubEnv("EXA_BASE_URL", `${EU_BASE_URL}//`);

    expect(baseURLOf(new Exa("test-key"))).toBe(EU_BASE_URL);
    expect(baseURLOf(new Exa("test-key", `${EU_BASE_URL}/`))).toBe(EU_BASE_URL);
  });

  it("takes the base URL from an options object given as the second argument", async () => {
    vi.stubEnv("EXA_BASE_URL", "http://127.0.0.1:9");
    const { baseURL, received } = await startServer();
    const sent: string[] = [];
    const exa = new Exa("test-key", {
      baseURL,
      fetch: (input, init) => {
        sent.push(String(input));
        return fetch(input, init);
      },
    });

    await exa.search("query");

    expect(sent).toEqual([`${baseURL}/search`]);
    expect(received).toEqual([["/search", "test-key"]]);
  });

  it("applies an options object given as the second argument", () => {
    expect(() => new Exa("test-key", { timeout: 0 })).toThrow(RangeError);
    expect(baseURLOf(new Exa("test-key", { timeout: 1_000 }))).toBe(
      "https://api.exa.ai"
    );
  });

  it("takes the base URL from options.baseURL after an undefined second argument", () => {
    expect(
      baseURLOf(new Exa("test-key", undefined, { baseURL: EU_BASE_URL }))
    ).toBe(EU_BASE_URL);
  });

  it("takes a URL object as the base URL", () => {
    const exa = new Exa("test-key", new URL(EU_BASE_URL) as unknown as string);

    expect(baseURLOf(exa)).toBe(EU_BASE_URL);
  });

  it("refuses the base URL given both as the second argument and in the options", () => {
    expect(
      () => new Exa("test-key", EU_BASE_URL, { baseURL: EU_BASE_URL })
    ).toThrow("Pass the base URL once");
  });

  it("refuses options given both as the second and the third argument", () => {
    expect(
      () =>
        new Exa(
          "test-key",
          { baseURL: EU_BASE_URL } as unknown as string,
          { timeout: 1_000 }
        )
    ).toThrow("Pass the client options once");
  });

  it("sends requests below a base URL given with a trailing slash", async () => {
    const { baseURL, received } = await startServer();

    await new Exa("test-key", `${baseURL}/`).search("query");

    expect(received).toEqual([["/search", "test-key"]]);
  });

  it("lets clients for two endpoints each use their own base URL and key", async () => {
    // A process-wide EXA_BASE_URL does not reach a client given its own baseURL.
    vi.stubEnv("EXA_BASE_URL", "http://127.0.0.1:9");
    const firstApi = await startServer();
    const secondApi = await startServer();
    const teamA = new Exa("team-a-key", firstApi.baseURL);
    const teamB = new Exa("team-b-key", secondApi.baseURL);

    await teamB.search("team b query");
    await teamA.search("team a query");
    await teamB.getContents(["https://example.com"]);
    await teamB.websets.list();

    expect(firstApi.received).toEqual([["/search", "team-a-key"]]);
    expect(secondApi.received).toEqual([
      ["/search", "team-b-key"],
      ["/contents", "team-b-key"],
      ["/websets/v0/websets", "team-b-key"],
    ]);
  });
});
