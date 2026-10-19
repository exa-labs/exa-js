/**
 * Offline tests for the client-wide `warnings` option: the warnings the API
 * returns about a request are logged once per process by default, dropped
 * with `"silent"`, and handed with their request context to a function.
 * `fetch` is stubbed so the SDK's own `request` and stream reader run; each
 * test imports a fresh module, so the once-per-process set starts empty.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  ApiWarning,
  ApiWarningContext,
  SearchWarning,
  WarningsOption,
} from "../../src";

function ignored(field: string): ApiWarning {
  return {
    code: "IGNORED_FIELD",
    path: `/${field}`,
    message: `${field} is no longer supported and is ignored. Remove it from the request.`,
  };
}

function searchBody(warnings?: unknown[], requestId: string | null = "req-1") {
  return {
    ...(requestId !== null && { requestId }),
    results: [{ url: "https://example.com", id: "1", title: "Example" }],
    ...(warnings && { warnings }),
  };
}

function jsonResponse(body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json", ...headers },
  });
}

function sseResponse(payloads: unknown[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const payload of payloads) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { "content-type": "text/event-stream" },
  });
}

/** A fresh `Exa` whose `fetch` answers every call with `respond()`. */
async function clientWith(
  respond: () => Response,
  warnings?: WarningsOption
) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => respond())
  );
  vi.resetModules();
  const { default: FreshExa } = await import("../../src");
  const options = warnings === undefined ? undefined : { warnings };
  return {
    FreshExa,
    exa: new FreshExa("test-key", "https://api.exa.ai", options),
  };
}

function collector() {
  const seen: Array<[ApiWarning, ApiWarningContext]> = [];
  const handler: WarningsOption = (warning, context) => {
    seen.push([warning, context]);
  };
  return { seen, handler };
}

describe("warnings client option", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("keeps SearchWarning as the generic ApiWarning", () => {
    const warning: SearchWarning = ignored("alias");
    const generic: ApiWarning = warning;
    expect(generic).toEqual(warning);
  });

  it("logs each warning once per process for each endpoint, code and path by default", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { FreshExa, exa } = await clientWith(() =>
      jsonResponse(searchBody([ignored("a"), ignored("b")]))
    );
    const second = new FreshExa("test-key", "https://api.exa.ai");

    const response = await exa.search("rust release notes");
    await exa.search("rust release notes");
    await second.search("rust release notes");

    expect(response.warnings).toEqual([ignored("a"), ignored("b")]);
    expect(warn.mock.calls).toEqual([
      [
        "[exa] POST /search IGNORED_FIELD at /a: a is no longer supported and is ignored. Remove it from the request.",
      ],
      [
        "[exa] POST /search IGNORED_FIELD at /b: b is no longer supported and is ignored. Remove it from the request.",
      ],
    ]);
  });

  it("logs nothing with 'silent' and keeps the warnings on the response", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { exa } = await clientWith(
      () => jsonResponse(searchBody([ignored("a")])),
      "silent"
    );

    const response = await exa.search("rust release notes");

    expect(warn).not.toHaveBeenCalled();
    expect(response.warnings).toEqual([ignored("a")]);
  });

  it("hands every warning and its request to a function instead of logging", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { seen, handler } = collector();
    const { exa } = await clientWith(
      () => jsonResponse(searchBody([ignored("a"), { code: "MALFORMED" }])),
      handler
    );

    await exa.search("rust release notes");
    await exa.search("rust release notes");

    const context = { endpoint: "/search", method: "POST", requestId: "req-1" };
    expect(seen).toEqual([
      [ignored("a"), context],
      [ignored("a"), context],
    ]);
    expect(warn).not.toHaveBeenCalled();
  });

  it("takes the request id from x-request-id when the body has none", async () => {
    const { seen, handler } = collector();
    const { exa } = await clientWith(
      () =>
        jsonResponse(searchBody([ignored("a")], null), {
          "x-request-id": "hdr-1",
        }),
      handler
    );

    await exa.search("rust release notes");

    expect(seen.map(([, context]) => context)).toEqual([
      { endpoint: "/search", method: "POST", requestId: "hdr-1" },
    ]);
  });

  it("reports nothing when the response has no warnings", async () => {
    const { seen, handler } = collector();
    const { exa } = await clientWith(() => jsonResponse(searchBody()), handler);

    await exa.search("rust release notes");

    expect(seen).toEqual([]);
  });

  it("reports the warnings of searchAndContents", async () => {
    const { seen, handler } = collector();
    const { exa } = await clientWith(
      () => jsonResponse(searchBody([ignored("legacy")])),
      handler
    );

    await exa.searchAndContents("rust release notes", { text: true });

    expect(seen.map(([warning]) => warning)).toEqual([ignored("legacy")]);
  });

  it("reports the warnings a search stream carries", async () => {
    const { seen, handler } = collector();
    const { exa } = await clientWith(
      () =>
        sseResponse([
          { requestId: "req-9", type: "results", results: [], warnings: [ignored("streamed")] },
        ]),
      handler
    );

    for await (const _chunk of exa.streamSearch("rust release notes")) {
      // Drain the stream.
    }

    expect(seen).toEqual([
      [
        ignored("streamed"),
        { endpoint: "/search", method: "POST", requestId: "req-9" },
      ],
    ]);
  });

  it("does not read the warnings field of other endpoints", async () => {
    const { seen, handler } = collector();
    let body: unknown = { warnings: ["envelope truncated"] };
    const { exa } = await clientWith(() => jsonResponse(body), handler);

    await exa.request("/agent/v0/monitors/m1", "GET");
    body = { warnings: [ignored("a")] };
    await exa.request("/contents", "POST", { urls: ["https://example.com"] });

    expect(seen).toEqual([]);
  });

  it("rejects a warnings option it does not know", async () => {
    vi.resetModules();
    const { default: FreshExa } = await import("../../src");

    expect(
      () =>
        new FreshExa("test-key", "https://api.exa.ai", {
          warnings: "loud" as never,
        })
    ).toThrow(
      new TypeError(
        'options.warnings must be "log", "silent" or a function, got "loud"'
      )
    );
  });
});
