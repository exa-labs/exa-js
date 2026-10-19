import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import Exa from "../../src";
import { ExaError } from "../../src/errors";

/**
 * Exercises Exa.request against a real local HTTP server so the genuine
 * fetch + body-parsing path is covered. The regression under test:
 * a gateway/proxy returning an HTML error page made request() throw an opaque
 * `SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON`
 * instead of an ExaError carrying the real HTTP status.
 */

const HTML_ERROR_PAGE =
  "<!DOCTYPE html>\n<html><head><title>502 Bad Gateway</title></head>" +
  "<body><h1>502 Bad Gateway</h1></body></html>";

function handle(url: string): {
  status: number;
  contentType: string;
  body: string;
} {
  switch (url) {
    case "/html-error":
      return { status: 502, contentType: "text/html", body: HTML_ERROR_PAGE };
    case "/html-ok":
      return { status: 200, contentType: "text/html", body: HTML_ERROR_PAGE };
    case "/json-error":
      return {
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Bad Request",
          message: "Invalid query",
        }),
      };
    case "/agent-error":
      return {
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            type: "CONFLICT",
            code: "IDEMPOTENCY_KEY_CONFLICT",
            message: "Idempotency-Key was already used for a different request",
            detail: "the key is bound to the body it created",
          },
          requestId: "req_e2e123",
        }),
      };
    case "/agent-error-no-message":
      return {
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({
          error: { type: "NOT_FOUND", code: "MONITOR_NOT_FOUND" },
        }),
      };
    case "/legacy-error-with-request-id":
      return {
        status: 429,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Rate limited",
          requestId: "req_legacy1",
        }),
      };
    case "/empty-ok":
      return { status: 200, contentType: "application/json", body: "" };
    default:
      return {
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      };
  }
}

describe("Exa.request non-JSON response handling", () => {
  let server: Server;
  let exa: Exa;

  beforeAll(async () => {
    server = createServer((req, res) => {
      const { status, contentType, body } = handle(req.url ?? "");
      res.writeHead(status, { "content-type": contentType });
      res.end(body);
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve)
    );
    const { port } = server.address() as AddressInfo;
    exa = new Exa("test-api-key", `http://127.0.0.1:${port}`);
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
  });

  it("throws an ExaError with the real status when an error body is HTML", async () => {
    const error = (await exa
      .request("/html-error", "POST")
      .catch((e) => e)) as ExaError;
    expect(error).toBeInstanceOf(ExaError);
    expect(error.statusCode).toBe(502);
    expect(error.message).toContain("502");
    expect(error.message).toContain("not valid JSON");
    expect(error.message).toContain("<!DOCTYPE html>");
    expect(error.message).not.toContain("Unexpected token");
  });

  it("throws an ExaError when a successful response has a non-JSON body", async () => {
    const error = (await exa
      .request("/html-ok", "POST")
      .catch((e) => e)) as ExaError;
    expect(error).toBeInstanceOf(ExaError);
    expect(error.statusCode).toBe(200);
    expect(error.message).toContain("non-JSON body");
    expect(error.message).toContain("<!DOCTYPE html>");
  });

  it("still surfaces structured JSON API errors unchanged", async () => {
    const error = (await exa
      .request("/json-error", "POST")
      .catch((e) => e)) as ExaError;
    expect(error).toBeInstanceOf(ExaError);
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe("Bad Request. Invalid query");
    expect(error.path).toBe("/json-error");
    expect(error.type).toBeUndefined();
    expect(error.code).toBeUndefined();
  });

  it("unwraps a structured error envelope instead of '[object Object]'", async () => {
    const error = (await exa
      .request("/agent-error", "POST")
      .catch((e) => e)) as ExaError;
    expect(error).toBeInstanceOf(ExaError);
    expect(error.statusCode).toBe(409);
    expect(error.message).toBe(
      "Idempotency-Key was already used for a different request"
    );
    expect(error.message).not.toContain("[object Object]");
    expect(error.type).toBe("CONFLICT");
    expect(error.code).toBe("IDEMPOTENCY_KEY_CONFLICT");
    expect(error.detail).toBe("the key is bound to the body it created");
    expect(error.requestId).toBe("req_e2e123");
    expect(error.path).toBe("/agent-error");
  });

  it("falls back to 'Unknown error' when a structured envelope has no message", async () => {
    const error = (await exa
      .request("/agent-error-no-message", "GET")
      .catch((e) => e)) as ExaError;
    expect(error).toBeInstanceOf(ExaError);
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe("Unknown error");
    expect(error.type).toBe("NOT_FOUND");
    expect(error.code).toBe("MONITOR_NOT_FOUND");
    expect(error.requestId).toBeUndefined();
  });

  it("keeps the legacy string envelope intact and carries a top-level requestId", async () => {
    const error = (await exa
      .request("/legacy-error-with-request-id", "GET")
      .catch((e) => e)) as ExaError;
    expect(error).toBeInstanceOf(ExaError);
    expect(error.statusCode).toBe(429);
    expect(error.message).toBe("Rate limited");
    expect(error.type).toBeUndefined();
    expect(error.code).toBeUndefined();
    expect(error.requestId).toBe("req_legacy1");
  });

  it("returns parsed JSON for a normal successful response", async () => {
    const result = await exa.request<{ ok: boolean }>("/ok", "POST");
    expect(result).toEqual({ ok: true });
  });

  it("returns undefined for an empty successful body without throwing", async () => {
    const result = await exa.request("/empty-ok", "POST");
    expect(result).toBeUndefined();
  });
});

/**
 * The streaming methods read an error response whole and build the same
 * ExaError `request()` builds from it, whatever the body's shape.
 */
describe("streaming methods' error responses", () => {
  let server: Server;
  let exa: Exa;
  /** What the server answers every request with. */
  let reply: { status: number; contentType: string; body: string };

  beforeAll(async () => {
    server = createServer((req, res) => {
      req.resume();
      req.on("end", () => {
        res.writeHead(reply.status, { "content-type": reply.contentType });
        res.end(reply.body);
      });
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve)
    );
    const { port } = server.address() as AddressInfo;
    exa = new Exa("test-api-key", `http://127.0.0.1:${port}`);
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
  });

  /** Drains a stream; resolves with how many items it yielded. */
  async function drain(stream: AsyncIterable<unknown>): Promise<number> {
    let count = 0;
    for await (const _item of stream) {
      count += 1;
    }
    return count;
  }

  const streams: Array<[string, string, () => Promise<number>]> = [
    ["streamAnswer", "/answer", () => drain(exa.streamAnswer("q"))],
    ["streamSearch", "/search", () => drain(exa.streamSearch("q"))],
    [
      "agent.runs.create({ stream: true })",
      "/agent/runs",
      async () =>
        drain(await exa.agent.runs.create({ query: "q", stream: true })),
    ],
    [
      "beta.agent.runs.create({ stream: true })",
      "/agent/runs",
      async () =>
        drain(await exa.beta.agent.runs.create({ query: "q", stream: true })),
    ],
  ];

  it.each(streams)(
    "%s carries the legacy body's message and requestId",
    async (_name, path, call) => {
      reply = {
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Invalid request body",
          requestId: "req_400",
          tag: "INVALID_REQUEST_BODY",
        }),
      };
      const error = (await call().catch((e) => e)) as ExaError;
      expect(error).toBeInstanceOf(ExaError);
      expect(error).toMatchObject({
        message: "Invalid request body",
        statusCode: 400,
        requestId: "req_400",
        path,
      });
    }
  );

  it.each(streams)(
    "%s unwraps a structured error envelope",
    async (_name, path, call) => {
      reply = {
        status: 429,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            type: "RATE_LIMITED",
            code: "TOO_MANY_REQUESTS",
            message: "Slow down",
          },
          requestId: "req_429",
        }),
      };
      const error = (await call().catch((e) => e)) as ExaError;
      expect(error).toBeInstanceOf(ExaError);
      expect(error).toMatchObject({
        message: "Slow down",
        statusCode: 429,
        type: "RATE_LIMITED",
        code: "TOO_MANY_REQUESTS",
        requestId: "req_429",
        path,
      });
    }
  );

  it.each(streams)(
    "%s reports the status and a snippet of a non-JSON error page",
    async (_name, path, call) => {
      reply = { status: 502, contentType: "text/html", body: HTML_ERROR_PAGE };
      const error = (await call().catch((e) => e)) as ExaError;
      expect(error).toBeInstanceOf(ExaError);
      expect(error.statusCode).toBe(502);
      expect(error.path).toBe(path);
      expect(error.message).toContain("not valid JSON");
      expect(error.message).toContain("<!DOCTYPE html>");
    }
  );

  it("builds the same error as the matching non-streaming call", async () => {
    reply = {
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ error: "Bad Request", message: "Invalid query" }),
    };
    const fields = ({ message, statusCode, path, requestId }: ExaError) => ({
      message,
      statusCode,
      path,
      requestId,
    });
    const fromAnswer = (await exa.answer("q").catch((e) => e)) as ExaError;
    const fromStream = (await drain(exa.streamAnswer("q")).catch(
      (e) => e
    )) as ExaError;
    expect(fields(fromStream)).toEqual(fields(fromAnswer));
    expect(fromStream.message).toBe("Bad Request. Invalid query");
  });
});
