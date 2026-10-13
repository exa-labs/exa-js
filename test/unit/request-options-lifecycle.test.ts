import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";

/** Deliver a Response finalizer without depending on GC scheduling. */
function responseFinalizers() {
  const callbacks = new WeakMap<object, () => void>();
  vi.stubGlobal(
    "FinalizationRegistry",
    class {
      constructor(private cleanup: (value: () => void) => void) {}
      register(target: object, value: () => void) {
        callbacks.set(target, () => this.cleanup(value));
      }
      unregister() {}
    }
  );
  return (response: Response) => callbacks.get(response)?.();
}

/**
 * Whether this runtime's `Response.clone()` hands the clone a body read error
 * unchanged. Node 18's clone passes its body through a structured clone, which
 * turns a `DOMException` into a plain object without a `name`.
 */
async function cloneKeepsReadErrors(): Promise<boolean> {
  const reason = new DOMException("probe", "AbortError");
  const clone = new Response(
    new ReadableStream({ start: (controller) => controller.error(reason) })
  ).clone();
  return clone
    .body!.getReader()
    .read()
    .then(
      () => false,
      (error) => error === reason
    );
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("response body lifetime", () => {
  it.each([
    ["reader", "abort"],
    ["clone", "abort"],
    ["reader", "timeout"],
    ["clone", "timeout"],
  ] as const)(
    "keeps a retained %s cancellable after Response finalization (%s)",
    async (retained, trigger) => {
      // Where the clone loses the read error, the rejection itself and the
      // closed connection still show that the request was cancelled.
      const checksName =
        retained === "reader" || (await cloneKeepsReadErrors());
      const finalize = responseFinalizers();
      vi.resetModules();
      const { default: Exa } = await import("../../src");
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
      let closed!: () => void;
      const connectionClosed = new Promise<void>((resolve) => {
        closed = resolve;
      });
      const server = createServer((_request, response) => {
        response.on("close", closed);
        response.writeHead(200, { "content-type": "text/plain" });
        response.write("first");
      });
      await new Promise<void>((resolve) =>
        server.listen(0, "127.0.0.1", resolve)
      );
      try {
        const exa = new Exa(
          "test-key",
          `http://127.0.0.1:${(server.address() as AddressInfo).port}`
        );
        const caller = new AbortController();
        const remove = vi.spyOn(caller.signal, "removeEventListener");
        const response = await exa.rawRequest(
          "/raw",
          "GET",
          undefined,
          undefined,
          undefined,
          { signal: caller.signal, timeout: 1000 }
        );
        const body = (retained === "clone" ? response.clone() : response).body!;
        const reader = body.getReader();
        expect(new TextDecoder().decode((await reader.read()).value)).toBe(
          "first"
        );
        finalize(response);
        expect(remove).not.toHaveBeenCalled();
        const pending = reader.read();
        const rejected = checksName
          ? expect(pending).rejects.toMatchObject({
              name: trigger === "abort" ? "AbortError" : "TimeoutError",
            })
          : expect(pending).rejects.toBeDefined();
        if (trigger === "abort") caller.abort();
        else await vi.advanceTimersByTimeAsync(1000);
        await rejected;
        await connectionClosed;
      } finally {
        server.closeAllConnections();
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
    }
  );

  it.each(["end", "error", "cancel"] as const)(
    "releases signal listeners and timers when the body settles via %s",
    async (ending) => {
      vi.resetModules();
      const { resolveRequestSignal, withDisposeOnBodySettled } = await import(
        "../../src/request-options"
      );
      const caller = new AbortController();
      const add = vi.spyOn(caller.signal, "addEventListener");
      const remove = vi.spyOn(caller.signal, "removeEventListener");
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
      const { dispose, needsDispose } = resolveRequestSignal({
        signal: caller.signal,
        timeout: 1000,
      });
      expect(needsDispose).toBe(true);
      expect(vi.getTimerCount()).toBe(1);
      const handler = add.mock.calls.find(([type]) => type === "abort")![1];
      let source!: ReadableStreamDefaultController<Uint8Array>;
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          source = controller;
        },
      });
      const release = vi.fn(dispose);
      const response = withDisposeOnBodySettled(new Response(body), release);
      const reader = response.body!.getReader();
      expect(remove).not.toHaveBeenCalled();
      if (ending === "cancel") await reader.cancel();
      else {
        const pending = reader.read();
        if (ending === "end") {
          source.close();
          await expect(pending).resolves.toMatchObject({ done: true });
        } else {
          const error = new Error("body failed");
          source.error(error);
          await expect(pending).rejects.toBe(error);
        }
      }
      expect(remove).toHaveBeenCalledWith("abort", handler);
      expect(release).toHaveBeenCalledTimes(1);
      expect(vi.getTimerCount()).toBe(0);
    }
  );
});
