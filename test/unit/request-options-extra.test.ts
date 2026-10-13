/**
 * `body`, `headers` and `query` in the trailing request options: extra fields
 * added to the request each method builds, on every API method.
 */
import {
  createServer,
  type IncomingHttpHeaders,
  type Server,
  type ServerResponse,
} from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import Exa, { type RequestOptions } from "../../src";
import {
  mergeRequestBody,
  mergeRequestHeaders,
  mergeRequestQuery,
} from "../../src/request-options";

/** One request as the server received it. */
type Captured = {
  method: string;
  path: string;
  query: URLSearchParams;
  headers: IncomingHttpHeaders;
  /** The raw request body; empty when none was sent. */
  text: string;
  /** The body parsed as JSON. Throws when it is not JSON. */
  json: () => Record<string, unknown>;
};

type Responder = (request: Captured, response: ServerResponse) => void;

const servers: Server[] = [];

const replyJson =
  (payload: unknown): Responder =>
  (_request, response) => {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify(payload));
  };

/**
 * Serve the real fetch path from a local server that records every request
 * and answers with `respond`.
 */
async function start(
  respond: Responder = replyJson({ results: [], citations: [], answer: "ok" })
): Promise<{ exa: Exa; requests: Captured[]; baseURL: string }> {
  const requests: Captured[] = [];
  const server = createServer((request, response) => {
    let text = "";
    request.on("data", (chunk) => {
      text += chunk;
    });
    request.on("end", () => {
      const url = new URL(request.url ?? "/", "http://localhost");
      const captured: Captured = {
        method: request.method ?? "",
        path: url.pathname,
        query: url.searchParams,
        headers: request.headers,
        text,
        json: () => JSON.parse(text),
      };
      requests.push(captured);
      respond(captured, response);
    });
  });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  const baseURL = `http://127.0.0.1:${port}`;
  return { exa: new Exa("test-key", baseURL), requests, baseURL };
}

afterEach(async () => {
  for (const server of servers.splice(0)) {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
});

describe("extra body", () => {
  const extra: RequestOptions = { body: { futureField: "new" } };

  it("is merged over the payload of every core method", async () => {
    const { exa, requests } = await start();

    await exa.search("test", undefined, extra);
    await exa.searchAndContents("test", { text: true }, extra);
    await exa.getContents("https://example.com", { text: true }, extra);
    await exa.findSimilar("https://example.com", undefined, extra);
    await exa.findSimilarAndContents(
      "https://example.com",
      { text: true },
      extra
    );
    await exa.answer("test", undefined, extra);

    expect(requests.map((request) => request.path)).toEqual([
      "/search",
      "/search",
      "/contents",
      "/findSimilar",
      "/findSimilar",
      "/answer",
    ]);
    for (const request of requests) {
      expect(request.json()).toMatchObject({ futureField: "new" });
      expect(request.json()).not.toHaveProperty("body");
    }
    expect(requests[0].json()).toMatchObject({ query: "test" });
    expect(requests[2].json()).toMatchObject({ urls: ["https://example.com"] });
    expect(requests[5].json()).toMatchObject({ query: "test" });
  });

  it("replaces a field the method also sets", async () => {
    const { exa, requests } = await start();
    await exa.search("test", { numResults: 5 }, { body: { numResults: 3 } });
    expect(requests[0].json()).toMatchObject({ query: "test", numResults: 3 });
  });

  it("never decides whether the response streams", async () => {
    const { exa, requests } = await start((request, response) => {
      if (request.json().stream) {
        response.writeHead(200, { "content-type": "text/event-stream" });
        response.end('data: {"choices":[{"delta":{"content":"hi"}}]}\n\n');
        return;
      }
      replyJson({ results: [] })(request, response);
    });

    await exa.search("test", undefined, { body: { stream: true, kept: 1 } });
    const chunks: string[] = [];
    for await (const chunk of exa.streamAnswer("test", undefined, {
      body: { stream: false, kept: 1 },
    })) {
      chunks.push(chunk.content ?? "");
    }

    expect(requests[0].json()).toMatchObject({ kept: 1 });
    expect(requests[0].json()).not.toHaveProperty("stream");
    expect(requests[1].json()).toMatchObject({ kept: 1, stream: true });
    expect(chunks).toEqual(["hi"]);
  });

  it("is read from the trailing argument only, never from an options bag", async () => {
    const { exa, requests } = await start();
    await exa.search("test", {
      body: { numResults: 3 },
      headers: { "x-from-bag": "1" },
    } as never);
    expect(requests[0].json()).not.toHaveProperty("numResults");
    expect(requests[0].headers).not.toHaveProperty("x-from-bag");
  });

  it("reaches the body of sub-client requests", async () => {
    const { exa, requests } = await start(replyJson({ id: "x" }));

    await exa.websets.create({} as never, undefined, extra);
    await exa.websets.searches.create("ws_1", {} as never, undefined, extra);
    await exa.research.create({ instructions: "test" }, extra);
    await exa.monitors.create({} as never, extra);
    await exa.agent.runs.create({ query: "test" }, extra);
    await exa.websets.cancel("ws_1", extra);

    expect(requests).toHaveLength(6);
    for (const request of requests) {
      expect(request.method).toBe("POST");
      expect(request.json()).toMatchObject({ futureField: "new" });
    }
    expect(requests[2].json()).toMatchObject({ instructions: "test" });
    expect(requests[5].json()).toEqual({ futureField: "new" });
  });

  it("is not sent with GET or DELETE requests", async () => {
    const { exa, requests } = await start(replyJson({ id: "x", data: [] }));
    await exa.websets.get("ws_1", undefined, extra);
    await exa.agent.runs.list(undefined, extra);
    await exa.websets.delete("ws_1", extra);
    expect(requests.map((request) => request.method)).toEqual([
      "GET",
      "GET",
      "DELETE",
    ]);
    for (const request of requests) {
      expect(request.text).toBe("");
    }
  });

  it("goes to the create request of a create-and-wait call, not to its polls", async () => {
    const { exa, requests } = await start((request, response) =>
      replyJson({
        id: "run_1",
        status: request.method === "POST" ? "running" : "completed",
      })(request, response)
    );

    const run = await exa.agent.runs.createAndWait(
      { query: "test" },
      { pollInterval: 1 },
      { ...extra, headers: { "x-trace": "abc" }, query: { debug: "1" } }
    );

    expect(run.status).toBe("completed");
    expect(requests.map((request) => request.method)).toEqual(["POST", "GET"]);
    expect(requests[0].json()).toMatchObject({
      query: "test",
      futureField: "new",
    });
    expect(requests[1].text).toBe("");
    for (const request of requests) {
      expect(request.headers["x-trace"]).toBe("abc");
      expect(request.query.get("debug")).toBe("1");
    }
  });

  it("reaches streaming sub-client requests", async () => {
    const { exa, requests } = await start((_request, response) => {
      response.writeHead(200, { "content-type": "text/event-stream" });
      response.end('event: done\ndata: {"ok":true}\n\n');
    });

    const events: string[] = [];
    for await (const event of await exa.agent.runs.create(
      { query: "test", stream: true },
      { ...extra, headers: { "x-trace": "abc" } }
    )) {
      events.push(event.event);
    }

    expect(events).toEqual(["done"]);
    expect(requests[0].json()).toMatchObject({
      query: "test",
      futureField: "new",
    });
    expect(requests[0].headers["x-trace"]).toBe("abc");
  });

  it("stays out of a CSV import's upload, as do extra headers and query", async () => {
    let uploadUrl = "";
    const { exa, requests, baseURL } = await start((request, response) =>
      replyJson({ id: "imp_1", uploadUrl })(request, response)
    );
    uploadUrl = `${baseURL}/upload`;

    await exa.websets.imports.create(
      { title: "t", entity: { type: "company" } } as never,
      "name\nacme\n",
      { ...extra, headers: { "x-trace": "abc" }, query: { debug: "1" } }
    );

    const [create, upload] = requests;
    expect(create.path).toBe("/websets/v0/imports");
    expect(create.json()).toMatchObject({ title: "t", futureField: "new" });
    expect(create.headers["x-trace"]).toBe("abc");
    expect(upload.method).toBe("PUT");
    expect(upload.path).toBe("/upload");
    expect(upload.text).toBe("name\nacme\n");
    expect(upload.headers).not.toHaveProperty("x-trace");
    expect(upload.query.has("debug")).toBe(false);
  });
});

describe("extra headers", () => {
  it("are sent with the request", async () => {
    const { exa, requests } = await start(replyJson({ id: "x", results: [] }));
    const requestOptions = { headers: { "X-Trace": "abc" } };

    await exa.search("test", undefined, requestOptions);
    await exa.getContents("https://example.com", undefined, requestOptions);
    await exa.websets.get("ws_1", undefined, requestOptions);
    await exa.beta.agent.runs.get("run_1", { betas: ["b"], ...requestOptions });

    expect(requests).toHaveLength(4);
    for (const request of requests) {
      expect(request.headers["x-trace"]).toBe("abc");
      expect(request.headers["x-api-key"]).toBe("test-key");
    }
    expect(requests[3].headers["exa-beta"]).toBe("b");
  });

  it("remove a header set to null", async () => {
    const { exa, requests } = await start();
    await exa.search("test", undefined, {
      headers: { "X-API-KEY": null, "x-kept": undefined },
    });
    expect(requests[0].headers["x-api-key"]).toBeUndefined();
    expect(requests[0].headers["x-kept"]).toBeUndefined();
  });

  it("replace a header the SDK sets, whatever its case", async () => {
    const { exa, requests } = await start();
    await exa.search(
      "test",
      { betas: ["from-option"] },
      {
        headers: {
          "X-API-KEY": "other-key",
          "user-agent": "my-app",
          "exa-beta": "from-header",
        },
      }
    );
    expect(requests[0].headers["x-api-key"]).toBe("other-key");
    expect(requests[0].headers["user-agent"]).toBe("my-app");
    expect(requests[0].headers["exa-beta"]).toBe("from-header");
  });
});

describe("extra query parameters", () => {
  it("are added to the URL of body and GET requests alike", async () => {
    const { exa, requests } = await start(replyJson({ id: "x", data: [] }));
    const requestOptions: RequestOptions = {
      query: { debug: "1", tag: ["a", "b"], skipped: undefined },
    };

    await exa.search("test", undefined, requestOptions);
    await exa.websets.get("ws_1", undefined, requestOptions);

    for (const request of requests) {
      expect(request.query.get("debug")).toBe("1");
      expect(request.query.getAll("tag")).toEqual(["a", "b"]);
      expect(request.query.has("skipped")).toBe(false);
    }
  });

  it("replace a parameter the method also sets and keep the others", async () => {
    const { exa, requests } = await start(replyJson({ data: [] }));
    await exa.websets.list(
      { limit: 5, cursor: "c1" },
      { query: { limit: 10 } }
    );
    expect(requests[0].query.get("limit")).toBe("10");
    expect(requests[0].query.get("cursor")).toBe("c1");
  });

  it("start a listing at a cursor without pinning it there", async () => {
    let served = 0;
    const { exa, requests } = await start((request, response) => {
      served += 1;
      // A listing stuck on `c1` would never end; stop feeding it.
      const more = request.query.get("cursor") === "c1" && served < 6;
      replyJson({
        data: [{ id: `item_${served}` }],
        hasMore: more,
        nextCursor: more ? "c2" : null,
      })(request, response);
    });
    const requestOptions = { query: { cursor: "c1", debug: "1" } };

    const websets = [];
    for await (const webset of exa.websets.listAll(undefined, requestOptions)) {
      websets.push(webset);
    }
    expect(websets).toHaveLength(2);
    expect(requests.map((request) => request.query.get("cursor"))).toEqual([
      "c1",
      "c2",
    ]);
    expect(requests.map((request) => request.query.get("debug"))).toEqual([
      "1",
      "1",
    ]);

    // getAll pages through listAll on a view that already carries the options.
    served = 0;
    requests.length = 0;
    const runs = await exa.agent.runs.getAll(undefined, requestOptions);
    expect(runs).toHaveLength(2);
    expect(requests.map((request) => request.query.get("cursor"))).toEqual([
      "c1",
      "c2",
    ]);
  });
});

describe("streaming stays the called method's decision", () => {
  const research = {
    researchId: "r1",
    createdAt: 1,
    model: "exa-research",
    instructions: "test",
    status: "completed",
  };
  const replyByStreamParam: Responder = (request, response) => {
    if (request.query.get("stream") === "true") {
      response.writeHead(200, { "content-type": "text/event-stream" });
      response.end('event: research-definition\ndata: {"researchId":"r1"}\n\n');
    } else {
      replyJson(research)(request, response);
    }
  };

  it("never takes stream from the extra query", async () => {
    const { exa, requests } = await start(replyByStreamParam);

    const result = await exa.research.get("r1", undefined, {
      query: { stream: "true", debug: "1" },
    });
    expect(result).toMatchObject({ researchId: "r1", status: "completed" });

    const events = [];
    for await (const event of await exa.research.get(
      "r1",
      { stream: true },
      { query: { stream: "false", debug: "1" } }
    )) {
      events.push(event);
    }
    expect(events).toHaveLength(1);

    expect(requests.map((request) => request.query.get("stream"))).toEqual([
      "false",
      "true",
    ]);
    expect(requests.map((request) => request.query.get("debug"))).toEqual([
      "1",
      "1",
    ]);
  });

  it("keeps the Accept header of a streaming method", async () => {
    const { exa, requests } = await start((request, response) => {
      if (String(request.headers.accept).includes("text/event-stream")) {
        response.writeHead(200, { "content-type": "text/event-stream" });
        response.end('event: done\ndata: {"ok":true}\n\n');
      } else {
        replyJson({ id: "run_1" })(request, response);
      }
    });

    for (const name of ["accept", "Accept", "ACCEPT"]) {
      const events: string[] = [];
      for await (const event of await exa.agent.runs.create(
        { query: "test", stream: true },
        { headers: { [name]: "application/json", "x-trace": "abc" } }
      )) {
        events.push(event.event);
      }
      expect(events).toEqual(["done"]);
    }
    for (const request of requests) {
      expect(request.headers.accept).toBe("text/event-stream");
      expect(request.headers["x-trace"]).toBe("abc");
    }
  });
});

describe("request and rawRequest", () => {
  const requestOptions: RequestOptions = {
    body: { b: 2 },
    query: { q: "2" },
    headers: { "x-b": "2" },
  };

  it("add the extras to their own arguments", async () => {
    const { exa, requests } = await start(replyJson({ ok: true }));

    await exa.request(
      "/custom",
      "POST",
      { a: 1 },
      { p: "1" },
      { "x-a": "1" },
      requestOptions
    );
    const response = await exa.rawRequest(
      "/custom",
      "POST",
      { a: 1 },
      { p: "1" },
      { "x-a": "1" },
      requestOptions
    );
    await response.text();

    expect(requests).toHaveLength(2);
    for (const request of requests) {
      expect(request.json()).toEqual({ a: 1, b: 2 });
      expect(request.query.get("p")).toBe("1");
      expect(request.query.get("q")).toBe("2");
      expect(request.headers["x-a"]).toBe("1");
      expect(request.headers["x-b"]).toBe("2");
    }
  });

  it("refuse to merge an extra body into a body that is not an object", async () => {
    const { exa, requests } = await start();
    await expect(
      exa.request("/custom", "POST", "raw text", undefined, undefined, {
        body: { b: 2 },
      })
    ).rejects.toThrow(TypeError);
    expect(requests).toHaveLength(0);
  });
});

describe("mergeRequestBody", () => {
  it("returns the method's body untouched when there is nothing to add", () => {
    const body = { a: 1 };
    expect(mergeRequestBody("POST", body)).toBe(body);
    expect(mergeRequestBody("GET", undefined, { b: 2 })).toBeUndefined();
    expect(mergeRequestBody("head", undefined, { b: 2 })).toBeUndefined();
    expect(
      mergeRequestBody("POST", undefined, { stream: true })
    ).toBeUndefined();
  });

  it("sends the extra fields alone when the method has no body", () => {
    expect(mergeRequestBody("POST", undefined, { b: 2 })).toEqual({ b: 2 });
    expect(mergeRequestBody("PATCH", null, { b: 2 })).toEqual({ b: 2 });
  });

  it("leaves requests other than POST, PUT and PATCH as they are", () => {
    expect(mergeRequestBody("DELETE", undefined, { b: 2 })).toBeUndefined();
    expect(mergeRequestBody("GET", undefined, { b: 2 })).toBeUndefined();
  });
});

describe("mergeRequestQuery", () => {
  it("merges extra parameters except stream", () => {
    const query = { cursor: "c1", limit: 5 };
    expect(mergeRequestQuery(query)).toBe(query);
    expect(mergeRequestQuery(query, { stream: "true" })).toBe(query);
    expect(mergeRequestQuery(query, { limit: 10, stream: "true" })).toEqual({
      cursor: "c1",
      limit: 10,
    });
    expect(mergeRequestQuery(undefined, { debug: "1" })).toEqual({
      debug: "1",
    });
    expect(mergeRequestQuery(query, { limit: undefined })).toBe(query);
    expect(
      mergeRequestQuery(query, { limit: null } as unknown as Record<
        string,
        string
      >)
    ).toBe(query);
  });
});

describe("mergeRequestHeaders", () => {
  it("replaces a header under any casing and leaves the input untouched", () => {
    const headers = { "x-api-key": "a", "Content-Type": "application/json" };
    expect(
      mergeRequestHeaders(headers, { "X-Api-Key": "b", "content-type": "c" })
    ).toEqual({ "X-Api-Key": "b", "content-type": "c" });
    expect(headers).toEqual({
      "x-api-key": "a",
      "Content-Type": "application/json",
    });
    expect(mergeRequestHeaders(headers)).toBe(headers);
  });

  it("removes a header set to null and skips one set to undefined", () => {
    expect(
      mergeRequestHeaders(
        { "x-api-key": "a", "X-A": "1" },
        { "X-API-KEY": null, "x-a": undefined, "x-b": "2" }
      )
    ).toEqual({ "X-A": "1", "x-b": "2" });
  });

  it("keeps an event-stream Accept and replaces any other", () => {
    expect(
      mergeRequestHeaders(
        { Accept: "text/event-stream" },
        { accept: "application/json" }
      )
    ).toEqual({ Accept: "text/event-stream" });
    expect(
      mergeRequestHeaders(
        { Accept: "application/json" },
        { accept: "text/plain" }
      )
    ).toEqual({ accept: "text/plain" });
  });

  it("replaces every casing of a header already present", () => {
    expect(
      mergeRequestHeaders(
        { "x-api-key": "a", "X-API-KEY": "b" },
        { "X-Api-Key": "c" }
      )
    ).toEqual({ "X-Api-Key": "c" });
  });
});
