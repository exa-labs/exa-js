/**
 * `apiKey` given as a function. Runs against a local HTTP server, so each test
 * sees the `x-api-key` every request carried and whether a request was sent.
 */
import { createServer, type IncomingHttpHeaders, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import Exa, {
  ExaAbortError,
  ExaTimeoutError,
  type ApiKeySource,
} from "../../src";

const servers: Server[] = [];

/**
 * Answers every request with an empty search response on a loopback port and
 * records the headers of each request that reaches it.
 */
async function startServer(): Promise<{
  baseURL: string;
  received: IncomingHttpHeaders[];
}> {
  const received: IncomingHttpHeaders[] = [];
  const server = createServer((request, response) => {
    received.push(request.headers);
    request.resume();
    request.on("end", () => {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ requestId: "req-1", results: [] }));
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

/** A function that returns `key` and counts its calls. */
function countingSource(key: string): ApiKeySource & { calls: number } {
  const source = Object.assign(
    () => {
      source.calls += 1;
      return key;
    },
    { calls: 0 }
  );
  return source;
}

/** A function that never returns and keeps the signal of each call. */
function stalledSource(): ApiKeySource & { signals: AbortSignal[] } {
  const signals: AbortSignal[] = [];
  return Object.assign(
    ({ signal }: { signal?: AbortSignal | undefined }) => {
      if (signal) {
        signals.push(signal);
      }
      return new Promise<string>(() => {});
    },
    { signals }
  );
}

describe("apiKey given as a function", () => {
  it.each([
    ["a function", (key: string) => key],
    ["an async function", async (key: string) => key],
  ])(
    "calls %s before each request and sends the key it returns each time",
    async (_, returnKey) => {
      const { baseURL, received } = await startServer();
      const keys = ["tok-1", "tok-2"];
      let calls = 0;
      const exa = new Exa(() => returnKey(keys[calls++]), baseURL);

      await exa.search("first");
      await exa.search("second");

      expect(calls).toBe(2);
      expect(received.map((headers) => headers["x-api-key"])).toEqual(keys);
    }
  );

  it("calls the function once for each of several concurrent requests", async () => {
    const { baseURL, received } = await startServer();
    let calls = 0;
    const exa = new Exa(async () => {
      calls += 1;
      const key = `tok-${calls}`;
      // Every call is still pending when the next request asks for a key.
      await new Promise((resolve) => setTimeout(resolve, 10));
      return key;
    }, baseURL);

    await Promise.all(
      Array.from({ length: 5 }, (_, index) => exa.search(`query ${index}`))
    );

    expect(calls).toBe(5);
    expect(received.map((headers) => headers["x-api-key"]).sort()).toEqual([
      "tok-1",
      "tok-2",
      "tok-3",
      "tok-4",
      "tok-5",
    ]);
  });

  it.each([
    [
      "throws",
      (error: Error): ApiKeySource =>
        () => {
          throw error;
        },
    ],
    [
      "rejects with",
      (error: Error): ApiKeySource =>
        async () => {
          throw error;
        },
    ],
  ])(
    "fails the request with the error the function %s, and sends nothing",
    async (_, failWith) => {
      const { baseURL, received } = await startServer();
      const error = new Error("no key");
      // A timeout gives the request a signal, so its error mapping runs too.
      const exa = new Exa(failWith(error), baseURL, { timeout: 10_000 });

      await expect(exa.search("query")).rejects.toBe(error);
      expect(received).toEqual([]);
    }
  );

  it.each([
    ["an empty string", ""],
    ["a key with an inner space", "tok 1"],
    ["a key with a leading U+FEFF", "\uFEFFtok-1"],
    ["a key with a trailing newline", "tok-1\n"],
    ["a key with a non-ASCII letter", "t\u00F6k-1"],
    ["a key with U+007F", "tok-1\u007F"],
    ["undefined", undefined],
    ["a number", 42],
  ])("refuses %s with a TypeError, and sends nothing", async (_, returned) => {
    const { baseURL, received } = await startServer();
    const sources = [() => returned, async () => returned];

    for (const source of sources) {
      const exa = new Exa(source as ApiKeySource, baseURL);
      const request = exa.search("query");
      await expect(request).rejects.toBeInstanceOf(TypeError);
      await expect(request).rejects.toThrow(
        "apiKey must return a non-empty string of visible ASCII characters"
      );
    }
    expect(received).toEqual([]);
  });

  it("sends a key of every visible ASCII character exactly as the function returns it", async () => {
    const { baseURL, received } = await startServer();
    const key = Array.from({ length: 0x7e - 0x21 + 1 }, (_, index) =>
      String.fromCharCode(0x21 + index)
    ).join("");
    const exa = new Exa(() => key, baseURL);

    await exa.search("query");

    expect(received.map((headers) => headers["x-api-key"])).toEqual([key]);
  });

  it("bounds the wait for the function with the timeout of a search, and aborts its signal", async () => {
    const { baseURL, received } = await startServer();
    const source = stalledSource();
    const exa = new Exa(source, baseURL, { timeout: 50 });

    await expect(exa.search("query")).rejects.toBeInstanceOf(ExaTimeoutError);

    expect(source.signals).toHaveLength(1);
    expect(source.signals[0].aborted).toBe(true);
    expect(received).toEqual([]);
  });

  it("bounds the wait for the function with the timeout of a streaming search, and aborts its signal", async () => {
    const { baseURL, received } = await startServer();
    const source = stalledSource();
    const exa = new Exa(source, baseURL);

    await expect(
      exa.streamSearch("query", undefined, { timeout: 50 }).next()
    ).rejects.toBeInstanceOf(ExaTimeoutError);

    expect(source.signals).toHaveLength(1);
    expect(source.signals[0].aborted).toBe(true);
    expect(received).toEqual([]);
  });

  it("ends the wait for the function when the caller's signal aborts, and aborts its signal", async () => {
    const { baseURL, received } = await startServer();
    const source = stalledSource();
    const exa = new Exa(source, baseURL);
    const controller = new AbortController();

    const request = exa.search("query", undefined, {
      signal: controller.signal,
    });
    controller.abort();

    await expect(request).rejects.toBeInstanceOf(ExaAbortError);
    expect(source.signals).toHaveLength(1);
    expect(source.signals[0].aborted).toBe(true);
    expect(received).toEqual([]);
  });

  it.each(["x-api-key", "X-Api-Key"])(
    "sends the %s header a call sets, without calling the function",
    async (name) => {
      const { baseURL, received } = await startServer();
      const source = countingSource("from-function");
      const exa = new Exa(source, baseURL);

      await exa.search("query", undefined, {
        headers: { [name]: "explicit" },
      });

      expect(source.calls).toBe(0);
      expect(received.map((headers) => headers["x-api-key"])).toEqual([
        "explicit",
      ]);
    }
  );

  it.each(["request", "rawRequest"] as const)(
    "sends an x-api-key header given to %s, without calling the function",
    async (method) => {
      const { baseURL, received } = await startServer();
      const source = countingSource("from-function");
      const exa = new Exa(source, baseURL);

      const response = await exa[method](
        "/search",
        "POST",
        { query: "query" },
        undefined,
        { "X-API-KEY": "explicit" }
      );
      if (response instanceof Response) {
        await response.text();
      }

      expect(source.calls).toBe(0);
      expect(received.map((headers) => headers["x-api-key"])).toEqual([
        "explicit",
      ]);
    }
  );

  it("sends no x-api-key when a call removes it with null, without calling the function", async () => {
    const { baseURL, received } = await startServer();
    const source = countingSource("from-function");
    const exa = new Exa(source, baseURL);

    await exa.search("query", undefined, { headers: { "x-api-key": null } });

    expect(source.calls).toBe(0);
    expect(received).toHaveLength(1);
    expect(received[0]).not.toHaveProperty("x-api-key");
  });

  it("calls the function when a call sets x-api-key to undefined", async () => {
    const { baseURL, received } = await startServer();
    const source = countingSource("from-function");
    const exa = new Exa(source, baseURL);

    await exa.search("query", undefined, {
      headers: { "x-api-key": undefined },
    });

    expect(source.calls).toBe(1);
    expect(received.map((headers) => headers["x-api-key"])).toEqual([
      "from-function",
    ]);
  });
});
