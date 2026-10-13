import { createServer, type RequestListener, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";
import Exa from "../../src";

/** Serve the real fetch path while keeping tests independent of Exa's API. */
async function serve(
  handler: RequestListener
): Promise<{ exa: Exa; server: Server }> {
  const server = createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return { exa: new Exa("test-key", `http://127.0.0.1:${port}`), server };
}

function deferred<T = void>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((ready) => {
    resolve = ready;
  });
  return { promise, resolve };
}

describe("request cancellation and timeouts", () => {
  const servers: Server[] = [];

  async function start(handler: RequestListener): Promise<Exa> {
    const { exa, server } = await serve(handler);
    servers.push(server);
    return exa;
  }

  afterEach(async () => {
    for (const server of servers.splice(0)) {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      );
    }
  });

  it("cancels a search before headers arrive rather than only racing its result", async () => {
    const arrived = deferred();
    const closed = deferred();
    const exa = await start((_request, response) => {
      response.on("close", () => closed.resolve());
      arrived.resolve();
    });
    const controller = new AbortController();
    const pending = exa.search("cancel me", { signal: controller.signal });
    await arrived.promise;
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    await closed.promise;
  });

  it("times out a stalled body and validates timeout units and bounds", async () => {
    const arrived = deferred();
    const exa = await start((_request, response) => {
      response.writeHead(200, { "content-type": "application/json" });
      response.write('{"results":');
      arrived.resolve();
    });
    await expect(exa.search("slow", { timeout: 30 })).rejects.toMatchObject({
      name: "TimeoutError",
    });
    await arrived.promise;
    for (const invalid of [0, 0.5, Number.NaN, 2_147_483_648]) {
      await expect(exa.search("invalid", { timeout: invalid })).rejects.toThrow(
        RangeError
      );
    }
  });

  it("keeps transport fields out of every core JSON payload while preserving beta headers", async () => {
    const bodies: Array<{
      path: string;
      body: Record<string, unknown>;
      beta: string | undefined;
    }> = [];
    const exa = await start((request, response) => {
      let payload = "";
      request.on("data", (chunk) => {
        payload += chunk;
      });
      request.on("end", () => {
        bodies.push({
          path: request.url ?? "",
          body: JSON.parse(payload),
          beta: request.headers["exa-beta"] as string | undefined,
        });
        response.writeHead(200, { "content-type": "application/json" });
        response.end(
          JSON.stringify({ results: [], citations: [], answer: "ok" })
        );
      });
    });
    const signal = new AbortController().signal;
    await exa.search("test", { signal, timeout: 1000, betas: ["test-beta"] });
    await exa.getContents("https://example.com", {
      signal,
      timeout: 1000,
      betas: ["test-beta"],
      text: true,
    });
    await exa.findSimilar("https://example.com", {
      signal,
      timeout: 1000,
      contents: false,
    });
    await exa.searchAndContents("test", { signal, timeout: 1000, text: true });
    await exa.findSimilarAndContents("https://example.com", {
      signal,
      timeout: 1000,
      text: true,
    });
    await exa.answer("test", { signal, timeout: 1000 });
    expect(bodies.map((entry) => entry.path)).toEqual([
      "/search",
      "/contents",
      "/findSimilar",
      "/search",
      "/findSimilar",
      "/answer",
    ]);
    for (const { body } of bodies) {
      expect(body).not.toHaveProperty("signal");
      expect(body).not.toHaveProperty("timeout");
      expect(body).not.toHaveProperty("betas");
    }
    expect(bodies[0].beta).toContain("test-beta");
    expect(bodies[1].beta).toContain("test-beta");
  });

  it("combines search body overrides with a third-argument abort signal", async () => {
    const arrived = deferred<Record<string, unknown>>();
    const closed = deferred();
    const exa = await start((request, response) => {
      let payload = "";
      request.on("data", (chunk) => {
        payload += chunk;
      });
      request.on("end", () => arrived.resolve(JSON.parse(payload)));
      response.on("close", () => closed.resolve());
    });
    const controller = new AbortController();
    const pending = exa.search(
      "test",
      { contents: false },
      { body: { numResults: 3 }, signal: controller.signal }
    );
    const payload = await arrived.promise;
    expect(payload).toMatchObject({ query: "test", numResults: 3 });
    expect(payload).not.toHaveProperty("signal");
    expect(payload).not.toHaveProperty("body");
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    await closed.promise;
  });

  it("closes SSE after a terminal event even if the server keeps the stream open", async () => {
    const closed = deferred();
    const exa = await start((_request, response) => {
      response.on("close", () => closed.resolve());
      response.writeHead(200, { "content-type": "text/event-stream" });
      response.write('data: {"tag":"complete","data":{"ok":true}}\n\n');
    });
    await expect(exa.request("/search", "POST")).resolves.toEqual({ ok: true });
    await closed.promise;
  });

  it("preserves raw Response metadata and aborts a body in the fallback signal path", async () => {
    const originalAny = Object.getOwnPropertyDescriptor(AbortSignal, "any");
    Object.defineProperty(AbortSignal, "any", {
      configurable: true,
      value: undefined,
    });
    try {
      const arrived = deferred();
      const closed = deferred();
      const exa = await start((_request, response) => {
        response.on("close", () => closed.resolve());
        response.writeHead(200, { "content-type": "text/plain" });
        response.write("first chunk");
        arrived.resolve();
      });
      const controller = new AbortController();
      const pending = exa.rawRequest(
        "/raw",
        "GET",
        undefined,
        undefined,
        undefined,
        {
          signal: controller.signal,
          timeout: 1000,
        }
      );
      await arrived.promise;
      const response = await pending;
      expect(response.url).toContain("/raw");
      expect(response.redirected).toBe(false);
      expect(response.type).toBe("basic");
      const body = response.text();
      controller.abort();
      await expect(body).rejects.toMatchObject({ name: "AbortError" });
      await closed.promise;
    } finally {
      if (originalAny) Object.defineProperty(AbortSignal, "any", originalAny);
    }
  });

  it("preserves URL and redirect metadata on cloned raw responses", async () => {
    const originalAny = Object.getOwnPropertyDescriptor(AbortSignal, "any");
    Object.defineProperty(AbortSignal, "any", {
      configurable: true,
      value: undefined,
    });
    try {
      const exa = await start((_request, response) => response.end("ok"));
      const response = await exa.rawRequest(
        "/clone",
        "GET",
        undefined,
        undefined,
        undefined,
        {
          signal: new AbortController().signal,
          timeout: 1000,
        }
      );
      const clone = response.clone();
      expect(clone.url).toBe(response.url);
      expect(clone.url).toContain("/clone");
      expect(clone.type).toBe(response.type);
      expect(clone.redirected).toBe(response.redirected);
      expect(await clone.text()).toBe("ok");
      expect(await response.text()).toBe("ok");
    } finally {
      if (originalAny) Object.defineProperty(AbortSignal, "any", originalAny);
    }
  });

  it("keeps raw requests usable with cross-fetch's Node stream fallback", async () => {
    const originalAny = Object.getOwnPropertyDescriptor(AbortSignal, "any");
    Object.defineProperty(AbortSignal, "any", {
      configurable: true,
      value: undefined,
    });
    vi.stubGlobal("fetch", undefined);
    try {
      vi.resetModules();
      const { default: FallbackExa } = await import("../../src");
      const { server } = await serve((_request, response) =>
        response.end("ok")
      );
      servers.push(server);
      const { port } = server.address() as AddressInfo;
      const exa = new FallbackExa("test-key", `http://127.0.0.1:${port}`);
      const response = await exa.rawRequest(
        "/raw",
        "GET",
        undefined,
        undefined,
        undefined,
        {
          signal: new AbortController().signal,
          timeout: 1000,
        }
      );
      expect(response.url).toContain("/raw");
      expect(await response.text()).toBe("ok");
    } finally {
      vi.unstubAllGlobals();
      if (originalAny) Object.defineProperty(AbortSignal, "any", originalAny);
    }
  });
});
