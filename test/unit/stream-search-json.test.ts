/**
 * `streamSearch` when the API answers with the whole search response as JSON
 * instead of an event stream, as it does for a search without `outputSchema`.
 * Runs against a local HTTP server so the real fetch, error, timeout and abort
 * paths are covered.
 */
import { createServer, type RequestListener, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";
import Exa, {
  ExaAbortError,
  ExaError,
  ExaTimeoutError,
  type SearchStreamChunk,
  type SearchWarning,
} from "../../src";
import { isJsonContentType } from "../../src/error-response";

const servers: Server[] = [];

/** Serves `handler` on a loopback port and returns a client for it. */
async function start(
  handler: RequestListener,
  options: ConstructorParameters<typeof Exa>[2] = { warnings: "silent" }
): Promise<Exa> {
  const server = createServer(handler);
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return new Exa("test-key", `http://127.0.0.1:${port}`, options);
}

afterEach(async () => {
  vi.restoreAllMocks();
  for (const server of servers.splice(0)) {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
});

function deferred<T = void>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((ready) => {
    resolve = ready;
  });
  return { promise, resolve };
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const JSON_CONTENT_TYPE = "application/json; charset=utf-8";

/** Answers every request with `body`, serialized, as JSON. */
function replyJson(body: unknown, status = 200): RequestListener {
  return (request, response) => {
    request.resume();
    request.on("end", () => {
      response.writeHead(status, { "content-type": JSON_CONTENT_TYPE });
      response.end(typeof body === "string" ? body : JSON.stringify(body));
    });
  };
}

/** A handler that accepts the request and never answers it. */
function stalled(onArrival?: () => void): RequestListener {
  return () => onArrival?.();
}

async function collect(
  stream: AsyncIterable<SearchStreamChunk>
): Promise<SearchStreamChunk[]> {
  const chunks: SearchStreamChunk[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return chunks;
}

const IGNORED_START: SearchWarning = {
  code: "IGNORED_FIELD",
  path: "/startCrawlDate",
  message:
    "startCrawlDate is no longer supported and is ignored. Remove it from the request.",
};

/** A `/search` response as the API sends it when it does not stream. */
const SEARCH_RESPONSE = {
  requestId: "req-json-1",
  resolvedSearchType: "neural",
  results: [
    {
      id: "https://example.com/a",
      url: "https://example.com/a",
      title: "Alpha",
      publishedDate: "2026-01-02T00:00:00.000Z",
      author: "Ada",
      text: "Alpha text",
      score: 0.9,
      highlights: ["Alpha highlight"],
    },
    { id: "https://example.com/b", url: "https://example.com/b", title: null },
  ],
  searchTime: 12.5,
  costDollars: { total: 0.007 },
};

/** The citations `streamSearch` makes of `SEARCH_RESPONSE.results`. */
const RESULT_CITATIONS = [
  {
    id: "https://example.com/a",
    url: "https://example.com/a",
    title: "Alpha",
    publishedDate: "2026-01-02T00:00:00.000Z",
    author: "Ada",
    text: "Alpha text",
  },
  { id: "https://example.com/b", url: "https://example.com/b" },
];

describe("streamSearch with a JSON response", () => {
  it("yields the results as citations, then the warnings on a chunk of their own", async () => {
    const exa = await start(
      replyJson({ ...SEARCH_RESPONSE, warnings: [IGNORED_START] })
    );

    const chunks = await collect(exa.streamSearch("q", { numResults: 2 }));

    expect(chunks).toEqual([
      { citations: RESULT_CITATIONS },
      { content: undefined, citations: undefined, warnings: [IGNORED_START] },
    ]);
    expect(chunks[1].citations).toBeUndefined();
  });

  it.each([
    ["no warnings field", SEARCH_RESPONSE],
    ["an empty warnings array", { ...SEARCH_RESPONSE, warnings: [] }],
  ])("yields only the results for %s", async (_name, body) => {
    const exa = await start(replyJson(body));

    const chunks = await collect(exa.streamSearch("q"));

    expect(chunks).toEqual([{ citations: RESULT_CITATIONS }]);
    expect(chunks[0]).not.toHaveProperty("warnings");
  });

  it("yields only the warnings when there are no results", async () => {
    const exa = await start(
      replyJson({ requestId: "req-1", results: [], warnings: [IGNORED_START] })
    );

    const chunks = await collect(exa.streamSearch("q"));

    expect(chunks).toEqual([{ warnings: [IGNORED_START] }]);
  });

  it.each([
    ["no results", { requestId: "req-1", results: [] }],
    ["an empty body", ""],
  ])("yields nothing for %s", async (_name, body) => {
    const exa = await start(replyJson(body));

    await expect(collect(exa.streamSearch("q"))).resolves.toEqual([]);
  });

  it("reports the warnings to the client's handler once, with the request ID", async () => {
    const handler = vi.fn();
    const exa = await start(
      replyJson({ ...SEARCH_RESPONSE, warnings: [IGNORED_START] }),
      { warnings: handler }
    );

    await collect(exa.streamSearch("q"));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(IGNORED_START, {
      endpoint: "/search",
      method: "POST",
      requestId: "req-json-1",
    });
  });

  it("still requests a stream", async () => {
    let sent: Record<string, unknown> = {};
    const exa = await start((request, response) => {
      let payload = "";
      request.on("data", (chunk) => {
        payload += chunk;
      });
      request.on("end", () => {
        sent = JSON.parse(payload);
        response.writeHead(200, { "content-type": JSON_CONTENT_TYPE });
        response.end(JSON.stringify(SEARCH_RESPONSE));
      });
    });

    await collect(exa.streamSearch("q"));

    expect(sent).toMatchObject({ query: "q", stream: true });
  });

  it("raises ExaError for a successful response whose body is not JSON", async () => {
    const exa = await start(replyJson("<html>Moved</html>"));

    const error = (await collect(exa.streamSearch("q")).catch(
      (e) => e
    )) as ExaError;

    expect(error).toBeInstanceOf(ExaError);
    expect(error).toMatchObject({ statusCode: 200, path: "/search" });
    expect(error.message).toContain(
      "Expected a JSON response but received a non-JSON body (status 200)"
    );
    expect(error.message).toContain("<html>Moved</html>");
  });

  it("can be left after the first chunk", async () => {
    const exa = await start(
      replyJson({ ...SEARCH_RESPONSE, warnings: [IGNORED_START] })
    );

    let first: SearchStreamChunk | undefined;
    for await (const chunk of exa.streamSearch("q")) {
      first = chunk;
      break;
    }

    expect(first).toEqual({ citations: RESULT_CITATIONS });
  });
});

describe("streamSearch errors with a JSON response", () => {
  const fields = (error: ExaError) => ({
    name: error.name,
    message: error.message,
    statusCode: error.statusCode,
    path: error.path,
    requestId: error.requestId,
    type: error.type,
    code: error.code,
  });

  it.each([
    [400, { error: "Invalid request body", requestId: "req_400" }],
    [
      429,
      {
        error: {
          type: "RATE_LIMITED",
          code: "TOO_MANY_REQUESTS",
          message: "Slow down",
        },
        requestId: "req_429",
      },
    ],
    [500, { error: "Internal Server Error", requestId: "req_500" }],
  ])(
    "raises the same ExaError as search() for status %i",
    async (status, body) => {
      const exa = await start(replyJson(body, status));

      const fromSearch = (await exa.search("q").catch((e) => e)) as ExaError;
      const fromStream = (await collect(exa.streamSearch("q")).catch(
        (e) => e
      )) as ExaError;

      expect(fromStream).toBeInstanceOf(ExaError);
      expect(fromStream.statusCode).toBe(status);
      expect(fromStream.requestId).toBe(body.requestId);
      expect(fields(fromStream)).toEqual(fields(fromSearch));
    }
  );
});

describe("streamSearch timeout and abort with a JSON response", () => {
  // Long enough for response headers to arrive on a loaded machine, and
  // shorter than the pause the slow response takes before finishing.
  const TIMEOUT_MS = 300;
  const BODY_PAUSE_MS = 450;

  it("times out a response that never starts", async () => {
    const exa = await start(stalled());

    await expect(
      exa.streamSearch("q", undefined, { timeout: 30 }).next()
    ).rejects.toBeInstanceOf(ExaTimeoutError);
  });

  it("does not cut a JSON body once its response has started", async () => {
    const body = JSON.stringify(SEARCH_RESPONSE);
    const exa = await start((request, response) => {
      request.resume();
      response.writeHead(200, { "content-type": JSON_CONTENT_TYPE });
      response.write(body.slice(0, 20));
      setTimeout(() => response.end(body.slice(20)), BODY_PAUSE_MS);
    });

    const chunks = await collect(
      exa.streamSearch("q", undefined, { timeout: TIMEOUT_MS })
    );

    expect(chunks).toEqual([{ citations: RESULT_CITATIONS }]);
  });

  it("aborts through the signal before the response starts", async () => {
    const arrived = deferred();
    const exa = await start(stalled(() => arrived.resolve()));
    const controller = new AbortController();

    const pending = exa
      .streamSearch("q", undefined, { signal: controller.signal })
      .next();
    await arrived.promise;
    controller.abort();

    await expect(pending).rejects.toBeInstanceOf(ExaAbortError);
  });

  it("aborts through the signal while the JSON body arrives", async () => {
    const wrote = deferred();
    const closed = deferred();
    const exa = await start((request, response) => {
      request.resume();
      response.on("close", () => closed.resolve());
      response.writeHead(200, { "content-type": JSON_CONTENT_TYPE });
      response.write('{"results":[', () => wrote.resolve());
    });
    const controller = new AbortController();

    const pending = exa
      .streamSearch("q", undefined, {
        signal: controller.signal,
        timeout: 60_000,
      })
      .next();
    await wrote.promise;
    await wait(50);
    controller.abort();

    await expect(pending).rejects.toBeInstanceOf(ExaAbortError);
    await closed.promise;
  });
});

describe("isJsonContentType", () => {
  it.each([
    ["application/json", true],
    ["application/json; charset=utf-8", true],
    ["Application/JSON;charset=UTF-8", true],
    ["application/problem+json", true],
    ["text/event-stream", false],
    ["text/event-stream; charset=utf-8", false],
    ["text/html", false],
    ["", false],
    [null, false],
  ])("%s is JSON: %s", (contentType, expected) => {
    expect(isJsonContentType(contentType)).toBe(expected);
  });
});
