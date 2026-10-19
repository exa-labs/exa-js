/**
 * Transport options as the trailing argument of every SDK method, the typed
 * abort/timeout errors, the client-level default timeout, and streams that a
 * timeout must not cut once they have started.
 */
import { createServer, type RequestListener, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";
import Exa, {
  AGENT_MONITORS_BETA_HEADER,
  ExaAbortError,
  ExaError,
  ExaTimeoutError,
  type TransportRequestOptions,
} from "../../src";

const servers: Server[] = [];

/** Serve the real fetch path while keeping tests independent of Exa's API. */
async function start(
  handler: RequestListener,
  options?: ConstructorParameters<typeof Exa>[2]
): Promise<Exa> {
  const server = createServer(handler);
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return new Exa("test-key", `http://127.0.0.1:${port}`, options);
}

function deferred<T = void>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((ready) => {
    resolve = ready;
  });
  return { promise, resolve };
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** A handler that accepts the request and never answers it. */
function stalled(onArrival?: () => void): RequestListener {
  return () => onArrival?.();
}

/** Collects the JSON body of every request and answers with `reply`. */
function recording(
  bodies: Array<{ path: string; body: Record<string, unknown> }>,
  reply: unknown = { results: [], citations: [], answer: "ok" }
): RequestListener {
  return (request, response) => {
    let payload = "";
    request.on("data", (chunk) => {
      payload += chunk;
    });
    request.on("end", () => {
      bodies.push({ path: request.url ?? "", body: JSON.parse(payload) });
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify(reply));
    });
  };
}

afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.resetModules();
  for (const server of servers.splice(0)) {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
});

describe("trailing requestOptions on the core methods", () => {
  it("takes signal and timeout after the options and keeps them out of the payload", async () => {
    const bodies: Array<{ path: string; body: Record<string, unknown> }> = [];
    const exa = await start(recording(bodies));
    const requestOptions = {
      signal: new AbortController().signal,
      timeout: 1000,
    };

    await exa.search("test", undefined, requestOptions);
    await exa.getContents(
      "https://example.com",
      { text: true },
      requestOptions
    );
    await exa.findSimilar("https://example.com", undefined, requestOptions);
    await exa.findSimilarAndContents(
      "https://example.com",
      { text: true },
      requestOptions
    );
    await exa.searchAndContents("test", { text: true }, requestOptions);
    await exa.answer("test", undefined, requestOptions);

    expect(bodies.map((entry) => entry.path)).toEqual([
      "/search",
      "/contents",
      "/findSimilar",
      "/findSimilar",
      "/search",
      "/answer",
    ]);
    for (const { body } of bodies) {
      expect(body).not.toHaveProperty("signal");
      expect(body).not.toHaveProperty("timeout");
      expect(body).not.toHaveProperty("requestOptions");
    }
  });

  it.each([
    [
      "getContents",
      (exa: Exa, o: TransportRequestOptions) =>
        exa.getContents("https://example.com", { text: true }, o),
    ],
    [
      "findSimilar",
      (exa: Exa, o: TransportRequestOptions) =>
        exa.findSimilar("https://example.com", undefined, o),
    ],
    [
      "answer",
      (exa: Exa, o: TransportRequestOptions) =>
        exa.answer("test", undefined, o),
    ],
  ])("cancels %s through the trailing signal", async (_name, call) => {
    const arrived = deferred();
    const exa = await start(stalled(arrived.resolve));
    const controller = new AbortController();
    const pending = call(exa, { signal: controller.signal });
    await arrived.promise;
    controller.abort();
    await expect(pending).rejects.toBeInstanceOf(ExaAbortError);
  });

  it("lets the trailing argument override the same field in the options bag", async () => {
    const exa = await start(stalled());
    const started = Date.now();
    await expect(
      exa.search("slow", { timeout: 60_000 }, { timeout: 30 })
    ).rejects.toMatchObject({ timeout: 30 });
    expect(Date.now() - started).toBeLessThan(5_000);
  });

  it("keeps a bag field the trailing argument leaves unset", async () => {
    const arrived = deferred();
    const exa = await start(stalled(arrived.resolve));
    const controller = new AbortController();
    const pending = exa.search(
      "cancel me",
      { signal: controller.signal },
      { timeout: 60_000 }
    );
    await arrived.promise;
    controller.abort();
    await expect(pending).rejects.toBeInstanceOf(ExaAbortError);
  });

  it("does not type `body` overrides into the search options bag", () => {
    const typeOnly = async (exa: Exa) => {
      // @ts-expect-error body overrides belong in the trailing requestOptions
      await exa.search("test", { body: { numResults: 3 } });
      // @ts-expect-error body overrides belong in the trailing requestOptions
      await exa.answer("test", { body: { text: true } });
      await exa.search("test", undefined, { body: { numResults: 3 } });
      await exa.answer("test", undefined, { body: { text: true } });
    };
    expect(typeOnly).toBeTypeOf("function");
  });
});

describe("typed abort and timeout errors", () => {
  it("rejects an aborted request with ExaAbortError that still reads as an AbortError", async () => {
    const arrived = deferred();
    const exa = await start(stalled(arrived.resolve));
    const controller = new AbortController();
    const pending = exa.search("cancel me", undefined, {
      signal: controller.signal,
    });
    await arrived.promise;
    controller.abort();

    const error = await pending.catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ExaAbortError);
    expect(error).not.toBeInstanceOf(ExaError);
    expect(error).toMatchObject({ name: "AbortError" });
    expect((error as ExaAbortError).cause).toBeDefined();
  });

  it("rejects a request aborted before it starts", async () => {
    const exa = await start(stalled());
    const controller = new AbortController();
    controller.abort();
    await expect(
      exa.search("never sent", undefined, { signal: controller.signal })
    ).rejects.toBeInstanceOf(ExaAbortError);
  });

  it("rejects a timed out request with ExaTimeoutError that still reads as a TimeoutError", async () => {
    const exa = await start((_request, response) => {
      response.writeHead(200, { "content-type": "application/json" });
      response.write('{"results":');
    });

    const error = await exa
      .search("slow", undefined, { timeout: 30 })
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ExaTimeoutError);
    expect(error).toBeInstanceOf(ExaError);
    expect(error).toMatchObject({
      name: "TimeoutError",
      statusCode: 408,
      timeout: 30,
      path: "/search",
    });
  });

  it("reports whichever of signal and timeout fired first", async () => {
    const arrived = deferred();
    const exa = await start(stalled(arrived.resolve));

    const controller = new AbortController();
    const aborted = exa.search("abort first", undefined, {
      signal: controller.signal,
      timeout: 60_000,
    });
    await arrived.promise;
    controller.abort();
    await expect(aborted).rejects.toBeInstanceOf(ExaAbortError);

    await expect(
      exa.search("timeout first", undefined, {
        signal: new AbortController().signal,
        timeout: 30,
      })
    ).rejects.toBeInstanceOf(ExaTimeoutError);
  });

  it("leaves API errors untouched", async () => {
    const exa = await start((_request, response) => {
      response.writeHead(404, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: "Not found" }));
    });
    const error = await exa
      .search("missing", undefined, {
        signal: new AbortController().signal,
        timeout: 1000,
      })
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ExaError);
    expect(error).not.toBeInstanceOf(ExaTimeoutError);
    expect(error).toMatchObject({ name: "ExaError", statusCode: 404 });
  });

  it("types a rawRequest that is cancelled before it gets a response", async () => {
    const exa = await start(stalled());
    await expect(
      exa.rawRequest("/raw", "GET", undefined, undefined, undefined, {
        timeout: 30,
      })
    ).rejects.toBeInstanceOf(ExaTimeoutError);
  });
});

describe("client-level default timeout", () => {
  it("applies to calls that set no timeout of their own", async () => {
    const exa = await start(stalled(), { timeout: 30 });
    await expect(exa.search("slow")).rejects.toMatchObject({
      name: "TimeoutError",
      timeout: 30,
    });
    await expect(exa.websets.get("ws_1")).rejects.toBeInstanceOf(
      ExaTimeoutError
    );
  });

  it("is overridden by a per-call timeout", async () => {
    const exa = await start(
      (_request, response) => {
        setTimeout(() => {
          response.writeHead(200, { "content-type": "application/json" });
          response.end(JSON.stringify({ results: [] }));
        }, 150);
      },
      { timeout: 30 }
    );
    await expect(
      exa.search("slow but fine", undefined, { timeout: 5_000 })
    ).resolves.toEqual({ results: [] });
  });

  it("passes fetch no signal unless a timeout is configured", async () => {
    const fetchMock = vi.fn(
      async (_url: string, _init?: RequestInit) =>
        new Response(JSON.stringify({ results: [] }), {
          headers: { "content-type": "application/json" },
        })
    );
    vi.stubGlobal("fetch", fetchMock);
    vi.resetModules();
    const { default: FreshExa } = await import("../../src");

    await new FreshExa("test-key", "http://127.0.0.1:1").search("no timeout");
    await new FreshExa("test-key", "http://127.0.0.1:1", {
      timeout: 1000,
    }).search("default timeout");

    expect(fetchMock.mock.calls[0][1]?.signal).toBeUndefined();
    expect(fetchMock.mock.calls[1][1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it("validates the timeout at construction", () => {
    for (const invalid of [0, 0.5, Number.NaN, 2_147_483_648]) {
      expect(
        () => new Exa("test-key", "http://127.0.0.1:1", { timeout: invalid })
      ).toThrow(RangeError);
    }
    expect(
      () =>
        new Exa("test-key", "http://127.0.0.1:1", {
          timeout: null as unknown as number,
        })
    ).toThrow(RangeError);
  });

  it("still applies when a call sets its timeout to null", async () => {
    const exa = await start(stalled(), { timeout: 30 });
    const noTimeout = { timeout: null as unknown as number };
    await expect(
      exa.search("slow", undefined, noTimeout)
    ).rejects.toMatchObject({ name: "TimeoutError", timeout: 30 });
    await expect(exa.search("slow", noTimeout)).rejects.toMatchObject({
      name: "TimeoutError",
      timeout: 30,
    });
    await expect(
      exa.websets.get("ws_1", undefined, noTimeout)
    ).rejects.toMatchObject({ name: "TimeoutError", timeout: 30 });
  });
});

describe("streams and timeouts", () => {
  // Long enough for response headers to arrive on a loaded machine, and
  // shorter than the pause the test streams take before finishing.
  const TIMEOUT_MS = 300;
  const STREAM_PAUSE_MS = 450;

  const chunk = (content: string) =>
    `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`;

  /** Starts a stream at once, then finishes it after `gapMs`. */
  function slowStream(gapMs: number, first: string, rest: string) {
    return ((_request, response) => {
      response.writeHead(200, { "content-type": "text/event-stream" });
      response.write(first);
      setTimeout(() => response.end(rest), gapMs);
    }) satisfies RequestListener;
  }

  it("does not cut a stream that started before the timeout elapsed", async () => {
    const exa = await start(
      slowStream(STREAM_PAUSE_MS, chunk("Hello"), chunk(" world"))
    );
    let answer = "";
    for await (const part of exa.streamAnswer("test", undefined, {
      timeout: TIMEOUT_MS,
    })) {
      answer += part.content ?? "";
    }
    expect(answer).toBe("Hello world");
  });

  it("applies the same rule to the client default and to streamSearch", async () => {
    const exa = await start(
      slowStream(STREAM_PAUSE_MS, chunk("Hello"), chunk(" world")),
      {
        timeout: TIMEOUT_MS,
      }
    );
    let text = "";
    for await (const part of exa.streamSearch("test")) {
      text += part.content ?? "";
    }
    expect(text).toBe("Hello world");
  });

  it("still times out a stream that never starts", async () => {
    const exa = await start(stalled());
    const stream = exa.streamAnswer("test", undefined, { timeout: 30 });
    await expect(stream.next()).rejects.toBeInstanceOf(ExaTimeoutError);
  });

  it("keeps the timeout on an error response, which a streaming call reads whole", async () => {
    const exa = await start((_request, response) => {
      response.writeHead(500, { "content-type": "application/json" });
      response.write('{"error":');
    });
    await expect(
      exa.streamAnswer("test", undefined, { timeout: TIMEOUT_MS }).next()
    ).rejects.toBeInstanceOf(ExaTimeoutError);
    await expect(
      exa.agent.runs.create(
        { query: "test", stream: true },
        { timeout: TIMEOUT_MS }
      )
    ).rejects.toBeInstanceOf(ExaTimeoutError);
  });

  it("cancels a running stream through the signal with ExaAbortError", async () => {
    const closed = deferred();
    const exa = await start((_request, response) => {
      response.on("close", () => closed.resolve());
      response.writeHead(200, { "content-type": "text/event-stream" });
      response.write(chunk("Hello"));
    });
    const controller = new AbortController();
    const stream = exa.streamAnswer("test", undefined, {
      signal: controller.signal,
      timeout: 60_000,
    });
    await expect(stream.next()).resolves.toMatchObject({
      value: { content: "Hello" },
    });
    const pending = stream.next();
    controller.abort();
    await expect(pending).rejects.toBeInstanceOf(ExaAbortError);
    await closed.promise;
  });

  it("does not cut Agent event streams either", async () => {
    const event = (name: string) =>
      `event: ${name}\ndata: ${JSON.stringify({ name })}\n\n`;
    const exa = await start(
      slowStream(STREAM_PAUSE_MS, event("first"), event("second"))
    );

    const agentEvents: string[] = [];
    for await (const agentEvent of await exa.agent.runs.create(
      { query: "test", stream: true },
      { timeout: TIMEOUT_MS }
    )) {
      agentEvents.push(agentEvent.event);
    }
    expect(agentEvents).toEqual(["first", "second"]);
  });

  it("keeps rawRequest's timeout running through the body", async () => {
    const exa = await start((_request, response) => {
      response.writeHead(200, { "content-type": "text/plain" });
      response.write("first");
    });
    const response = await exa.rawRequest(
      "/raw",
      "GET",
      undefined,
      undefined,
      undefined,
      { timeout: TIMEOUT_MS }
    );
    await expect(response.text()).rejects.toMatchObject({
      name: "TimeoutError",
    });
  });
});

describe("trailing requestOptions on the API sub-clients", () => {
  const betas = [AGENT_MONITORS_BETA_HEADER];
  const requestOptions = {
    signal: new AbortController().signal,
    timeout: 1000,
  };

  /** Every sub-client, called with `o` as its trailing argument. */
  const calls: Array<
    [string, (exa: Exa, o: TransportRequestOptions) => unknown]
  > = [
    [
      "websets.create",
      (exa, o) => exa.websets.create({} as never, undefined, o),
    ],
    ["websets.get", (exa, o) => exa.websets.get("ws_1", undefined, o)],
    ["websets.list", (exa, o) => exa.websets.list(undefined, o)],
    ["websets.update", (exa, o) => exa.websets.update("ws_1", {}, o)],
    ["websets.delete", (exa, o) => exa.websets.delete("ws_1", o)],
    ["websets.cancel", (exa, o) => exa.websets.cancel("ws_1", o)],
    [
      "websets.items.list",
      (exa, o) => exa.websets.items.list("ws_1", undefined, o),
    ],
    [
      "websets.items.get",
      (exa, o) => exa.websets.items.get("ws_1", "item_1", o),
    ],
    [
      "websets.searches.get",
      (exa, o) => exa.websets.searches.get("ws_1", "s_1", o),
    ],
    [
      "websets.enrichments.get",
      (exa, o) => exa.websets.enrichments.get("ws_1", "e_1", o),
    ],
    ["websets.events.list", (exa, o) => exa.websets.events.list(undefined, o)],
    ["websets.imports.get", (exa, o) => exa.websets.imports.get("imp_1", o)],
    [
      "websets.imports.create",
      (exa, o) => exa.websets.imports.create({} as never, undefined, o),
    ],
    ["websets.monitors.get", (exa, o) => exa.websets.monitors.get("mon_1", o)],
    [
      "websets.monitors.runs.list",
      (exa, o) => exa.websets.monitors.runs.list("mon_1", undefined, o),
    ],
    [
      "websets.webhooks.listAttempts",
      (exa, o) => exa.websets.webhooks.listAttempts("wh_1", undefined, o),
    ],
    ["monitors.create", (exa, o) => exa.monitors.create({} as never, o)],
    ["monitors.get", (exa, o) => exa.monitors.get("mon_1", o)],
    [
      "monitors.runs.list",
      (exa, o) => exa.monitors.runs.list("mon_1", undefined, o),
    ],
    [
      "agent.runs.create",
      (exa, o) => exa.agent.runs.create({ query: "test" }, o),
    ],
    ["agent.runs.get", (exa, o) => exa.agent.runs.get("run_1", o)],
    ["agent.runs.list", (exa, o) => exa.agent.runs.list(undefined, o)],
    ["agent.runs.cancel", (exa, o) => exa.agent.runs.cancel("run_1", o)],
    [
      "agent.runs.events.list",
      (exa, o) => exa.agent.runs.events.list("run_1", undefined, o),
    ],
    [
      "beta.agent.runs.get",
      (exa, o) => exa.beta.agent.runs.get("run_1", { betas: ["b"], ...o }),
    ],
    ["beta.agent.runs.stop", (exa, o) => exa.beta.agent.runs.stop("run_1", o)],
    [
      "beta.agent.runs.list",
      (exa, o) => exa.beta.agent.runs.list({ betas: ["b"] }, o),
    ],
    [
      "beta.agent.monitors.get",
      (exa, o) => exa.beta.agent.monitors.get("mon_1", { betas }, o),
    ],
    [
      "beta.agent.monitors.entities.list",
      (exa, o) => exa.beta.agent.monitors.entities.list("mon_1", { betas }, o),
    ],
    [
      "beta.agent.monitors.backtests.get",
      (exa, o) => exa.beta.agent.monitors.backtests.get("bt_1", { betas }, o),
    ],
  ];

  it.each(calls)("%s forwards them to the request", async (_name, call) => {
    const exa = new Exa("test-key", "http://127.0.0.1:1");
    const request = vi
      .spyOn(exa, "request")
      .mockResolvedValue({ data: [], hasMore: false });
    await call(exa, requestOptions);
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][5]).toEqual(requestOptions);
  });

  it("sends them with every page of a paginated listing", async () => {
    const exa = new Exa("test-key", "http://127.0.0.1:1");
    const request = vi
      .spyOn(exa, "request")
      .mockResolvedValueOnce({
        data: [{ id: "ws_1" }],
        hasMore: true,
        nextCursor: "next",
      })
      .mockResolvedValueOnce({ data: [{ id: "ws_2" }], hasMore: false });

    const websets = await exa.websets.getAll({ limit: 1 }, requestOptions);

    expect(websets.map((webset) => webset.id)).toEqual(["ws_1", "ws_2"]);
    expect(request).toHaveBeenCalledTimes(2);
    for (const args of request.mock.calls) {
      expect(args[5]).toEqual(requestOptions);
    }
  });

  it("calls request with its original arguments when none are given", async () => {
    const exa = new Exa("test-key", "http://127.0.0.1:1");
    const request = vi.spyOn(exa, "request").mockResolvedValue({});
    await exa.agent.runs.get("run_1");
    expect(request).toHaveBeenNthCalledWith(
      1,
      "/agent/runs/run_1",
      "GET",
      undefined,
      undefined,
      undefined
    );
  });

  it("stops a poll as soon as the signal aborts instead of sitting out the interval", async () => {
    const exa = new Exa("test-key", "http://127.0.0.1:1");
    vi.spyOn(exa, "request").mockResolvedValue({
      id: "run_1",
      status: "running",
    });
    const controller = new AbortController();
    const started = Date.now();
    const poll = exa.agent.runs.pollUntilFinished(
      "run_1",
      { pollInterval: 60_000 },
      { signal: controller.signal }
    );
    await wait(20);
    controller.abort();
    await expect(poll).rejects.toBeInstanceOf(ExaAbortError);
    expect(Date.now() - started).toBeLessThan(5_000);
  });

  it.each([
    [
      "agent.runs.pollUntilFinished",
      (exa: Exa, o: TransportRequestOptions) =>
        exa.agent.runs.pollUntilFinished("run_1", { pollInterval: 1 }, o),
    ],
    [
      "websets.waitUntilIdle",
      (exa: Exa, o: TransportRequestOptions) =>
        exa.websets.waitUntilIdle("ws_1", { pollInterval: 1 }, o),
    ],
  ])(
    "%s rejects with ExaTimeoutError when a poll exceeds its request timeout",
    async (_name, poll) => {
      let polls = 0;
      const exa = await start(stalled(() => (polls += 1)));
      const error = await poll(exa, { timeout: 30 }).catch(
        (caught: unknown) => caught
      );
      expect(error).toBeInstanceOf(ExaTimeoutError);
      expect(error).toMatchObject({ statusCode: 408, timeout: 30 });
      expect(polls).toBe(1);
    }
  );

  it("cancels a CSV import's upload through the signal", async () => {
    const arrived = deferred();
    const uploads = await start(stalled(arrived.resolve));
    const { port } = (servers[0].address() as AddressInfo) ?? {};
    vi.spyOn(uploads, "request").mockResolvedValue({
      id: "imp_1",
      uploadUrl: `http://127.0.0.1:${port}/upload`,
    });
    const controller = new AbortController();
    const pending = uploads.websets.imports.create(
      { title: "t", entity: { type: "company" } } as never,
      "name\nacme\n",
      { signal: controller.signal }
    );
    await arrived.promise;
    controller.abort();
    await expect(pending).rejects.toBeInstanceOf(ExaAbortError);
  });
});
