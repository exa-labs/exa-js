/**
 * The `fetch` client option. Runs against a local HTTP server, so each test
 * checks that the requests the client makes pass through the given `fetch`
 * and still reach the server.
 */
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import Exa, { type SearchStreamChunk } from "../../src";

const servers: Server[] = [];

/**
 * Answers every request with a search response of one result on a loopback
 * port and records the path of each request that reaches it.
 */
async function startServer(): Promise<{ baseURL: string; received: string[] }> {
  const received: string[] = [];
  const server = createServer((request, response) => {
    received.push(request.url ?? "");
    request.resume();
    request.on("end", () => {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          requestId: "req-1",
          results: [{ id: "result-1", url: "https://example.com/a" }],
        })
      );
    });
  });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return { baseURL: `http://127.0.0.1:${port}`, received };
}

afterEach(async () => {
  for (const server of servers.splice(0)) {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
});

describe("the fetch client option", () => {
  it("sends a search and a streaming search through the fetch it is given", async () => {
    const { baseURL, received } = await startServer();
    const sent: Array<{ url: string; streams: boolean }> = [];
    const recordingFetch: typeof fetch = (input, init) => {
      sent.push({
        url: String(input),
        streams: JSON.parse(String(init?.body)).stream === true,
      });
      return fetch(input, init);
    };
    const exa = new Exa("test-key", baseURL, { fetch: recordingFetch });

    await exa.search("query");
    const chunks: SearchStreamChunk[] = [];
    for await (const chunk of exa.streamSearch("query")) {
      chunks.push(chunk);
    }

    expect(sent).toEqual([
      { url: `${baseURL}/search`, streams: false },
      { url: `${baseURL}/search`, streams: true },
    ]);
    expect(received).toEqual(["/search", "/search"]);
    expect(chunks[0]?.citations?.map((citation) => citation.url)).toEqual([
      "https://example.com/a",
    ]);
  });

  it("refuses a fetch that is not a function", () => {
    const options = { fetch: "fetch" as unknown as typeof fetch };

    expect(() => new Exa("test-key", undefined, options)).toThrow(TypeError);
    expect(() => new Exa("test-key", undefined, options)).toThrow(
      "options.fetch must be a function"
    );
  });
});
