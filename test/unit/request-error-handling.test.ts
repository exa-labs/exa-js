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
    const error = await exa.request("/html-error", "POST").catch((e) => e);
    expect(error).toBeInstanceOf(ExaError);
    expect(error.statusCode).toBe(502);
    expect(error.message).toContain("502");
    expect(error.message).toContain("not valid JSON");
    expect(error.message).toContain("<!DOCTYPE html>");
    expect(error.message).not.toContain("Unexpected token");
  });

  it("throws an ExaError when a successful response has a non-JSON body", async () => {
    const error = await exa.request("/html-ok", "POST").catch((e) => e);
    expect(error).toBeInstanceOf(ExaError);
    expect(error.statusCode).toBe(200);
    expect(error.message).toContain("non-JSON body");
    expect(error.message).toContain("<!DOCTYPE html>");
  });

  it("still surfaces structured JSON API errors unchanged", async () => {
    const error = await exa.request("/json-error", "POST").catch((e) => e);
    expect(error).toBeInstanceOf(ExaError);
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe("Bad Request. Invalid query");
    expect(error.path).toBe("/json-error");
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
