import { beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

type RecordedRequest = {
  mode: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
  outcome: string;
};

const requests: RecordedRequest[] = [];
const streaming = { value: false };
const responsePayload = { value: {} as Record<string, unknown> };
const responseFixtures = Object.fromEntries(
  fs
    .readFileSync(path.join(__dirname, "fixtures/responses.json"), "utf8")
    .replace(/\r\n/g, "\n")
    .trim()
    .split("\n")
    .map((line) => {
      const item = JSON.parse(line) as {
        endpoint: string;
        payload: Record<string, unknown>;
      };
      return [item.endpoint, item.payload];
    })
) as Record<string, Record<string, unknown>>;

vi.mock("cross-fetch", () => ({
  default: (...args: [string, RequestInit?]) => mockFetch(...args),
  Headers,
}));

async function mockFetch(
  input: string | URL,
  init: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(init.headers);
  const normalized: Record<string, string> = {};
  headers.forEach((value, key) => {
    normalized[key] = value;
  });
  if (normalized["x-api-key"]) normalized["x-api-key"] = "<dummy-api-key>";
  if (normalized["user-agent"]) normalized["user-agent"] = "<exa-node/version>";
  requests.push({
    mode: "async",
    method: init.method ?? "GET",
    url: String(input),
    headers: Object.fromEntries(
      Object.entries(normalized).sort(([a], [b]) => a.localeCompare(b))
    ),
    body: typeof init.body === "string" ? init.body : undefined,
    outcome: "ok",
  });
  if (streaming.value) {
    return new Response(
      'data: {"content":"hello"}\n\ndata: {"citations":[]}\n\ndata: [DONE]\n\n',
      { status: 200, headers: { "content-type": "text/event-stream" } }
    );
  }
  const requestPath = new URL(String(input)).pathname;
  const fixture = Object.entries(responseFixtures).find(([key]) => {
    const [method, template] = key.split(" ", 2);
    const pattern = `^${template.replace(/\{[^}]+\}/g, "[^/]+")}$`;
    return (
      method === (init.method ?? "GET") && new RegExp(pattern).test(requestPath)
    );
  })?.[1];
  return new Response(JSON.stringify(fixture ?? responsePayload.value), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

const inventoryPath = path.join(__dirname, "exa-js-surface.tsv");
const goldenPath = path.join(__dirname, "goldens/requests.json");
const responseGoldenPath = path.join(__dirname, "goldens/responses.json");

function inventory(): Array<Record<string, string>> {
  const [header, ...lines] = fs
    .readFileSync(inventoryPath, "utf8")
    .replace(/\r\n/g, "\n")
    .trim()
    .split("\n");
  const fields = header.split("\t");
  return lines.map((line) =>
    Object.fromEntries(
      line.split("\t").map((value, index) => [fields[index], value])
    )
  );
}

function endpointRows(): Array<Record<string, string>> {
  const rows = new Map<string, Record<string, string>>();
  for (const row of inventory()) {
    if (row.http_endpoint === "n/a") continue;
    if (!rows.has(row.http_endpoint)) rows.set(row.http_endpoint, row);
  }
  return [...rows.values()];
}

function resolve(
  client: any,
  namespace: string,
  method: string,
  endpoint: string
): any {
  if (endpoint.endsWith("/entities")) {
    return client.beta.agent.monitors.entities[method].bind(
      client.beta.agent.monitors.entities
    );
  }
  if (endpoint.endsWith("/changes")) {
    return client.beta.agent.monitors.changes[method].bind(
      client.beta.agent.monitors.changes
    );
  }
  if (endpoint.includes("/snapshot")) {
    return client.beta.agent.monitors.snapshots[method].bind(
      client.beta.agent.monitors.snapshots
    );
  }
  if (namespace.includes("agent.monitors")) {
    return client.beta.agent.monitors[method].bind(client.beta.agent.monitors);
  }
  let current = client;
  for (const part of namespace.split(".").slice(1)) current = current[part];
  return current[method].bind(current);
}

function callArgs(endpoint: string, method: string): unknown[] {
  const [, requestPath] = endpoint.split(" ", 2);
  const placeholders = [...requestPath.matchAll(/\{[^}]+\}/g)].length;
  const ids: unknown[] = Array.from(
    { length: placeholders },
    () => "conformance-id"
  );
  if (requestPath.startsWith("/agent/monitors")) {
    const betas = ["agent-monitors-2026-08-04"];
    if (requestPath.endsWith("/entities")) {
      return ids.concat([{ betas, entities: [] }]);
    }
    if (requestPath.endsWith("/changes")) {
      return ids.concat([{ betas }]);
    }
    if (requestPath.includes("/snapshot")) {
      return requestPath.endsWith("/snapshot")
        ? [{ betas, entities: [], fields: [] }]
        : ids.concat([{ betas }]);
    }
    if (method === "create") {
      return [{ betas, cadence: "daily", entities: [], fields: [] }];
    }
    if (requestPath.includes("{monitorId}")) {
      return ids.concat([{ betas }]);
    }
    return ids.concat(method === "list" ? [{ betas }] : []);
  }
  if (["GET", "DELETE"].includes(endpoint.split(" ", 1)[0])) {
    return ids.concat(method === "list" ? [{}] : []);
  }
  if (["search", "findSimilar", "getContents", "answer"].includes(method)) {
    return method === "getContents"
      ? [
          ["https://example.com", "https://example.org"],
          { subpages: { include: ["https://example.com"] } },
        ]
      : [
          "conformance-value",
          {
            numResults: 1,
            contents: { text: { maxCharacters: 1 } },
            includeDomains: ["example.com", "example.org"],
            excludeDomains: ["invalid.example", "invalid2.example"],
            livecrawl: "always",
            summary: { schema: { type: "object", properties: {} } },
            outputSchema: { type: "object", properties: {} },
            systemPrompt: "conformance-value",
            userLocation: "US",
            stream: false,
          },
        ];
  }
  return ids.concat([
    {
      query: "conformance-value",
      numResults: 1,
      includeDomains: ["example.com", "example.org"],
      excludeDomains: ["invalid.example", "invalid2.example"],
      contents: { text: { maxCharacters: 1 } },
      summary: { schema: { type: "object", properties: {} } },
      outputSchema: { type: "object", properties: {} },
      systemPrompt: "conformance-value",
      userLocation: "US",
      stream: false,
    },
  ]);
}

async function drive(client: any, row: Record<string, string>): Promise<void> {
  const method = resolve(client, row.namespace, row.method, row.http_endpoint);
  try {
    const result = await method(...callArgs(row.http_endpoint, row.method));
    if (result && typeof result[Symbol.asyncIterator] === "function") {
      await result.next();
    }
  } catch (error) {
    if (requests.length === 0) throw error;
    requests[requests.length - 1].outcome = `raised:${
      error instanceof Error ? error.constructor.name : "UnknownError"
    }`;
  }
}

function writeOrCompare(value: unknown, target = goldenPath): void {
  const rendered = (value as unknown[])
    .map((item) => JSON.stringify(item))
    .join("\n") + "\n";
  if (process.env.EXA_CONFORMANCE_RECORD === "1") {
    fs.writeFileSync(target, rendered);
  } else {
    expect(fs.readFileSync(target, "utf8").replace(/\r\n/g, "\n")).toBe(
      rendered
    );
  }
}

function publicShape(value: unknown): unknown {
  if (
    value === null ||
    ["string", "number", "boolean"].includes(typeof value)
  ) {
    return { type: value === null ? "null" : typeof value, value };
  }
  if (Array.isArray(value)) {
    return { type: "array", items: value.map(publicShape) };
  }
  if (typeof value === "object") {
    return {
      type:
        (value as { constructor?: { name?: string } }).constructor?.name ??
        "object",
      attributes: Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, item]) => [key, publicShape(item)])
      ),
    };
  }
  return { type: typeof value, value: String(value) };
}

describe("offline request conformance", () => {
  beforeEach(() => {
    requests.length = 0;
    streaming.value = false;
    responsePayload.value = {};
    vi.resetModules();
    vi.stubGlobal("fetch", undefined);
  });

  it.each(endpointRows())("drives $http_endpoint", async (row) => {
    const { Exa } = await import("../../src/index");
    const client = new Exa("dummy-api-key");
    await drive(client, row);
    expect(requests).toHaveLength(1);
    expect(new URL(requests[0].url).pathname).toMatch(
      new RegExp(
        `^${row.http_endpoint.split(" ", 2)[1].replace(/\{[^}]+\}/g, "[^/]+")}$`
      )
    );
  });

  it("records the complete request corpus", async () => {
    const { Exa } = await import("../../src/index");
    const client = new Exa("dummy-api-key");
    for (const row of endpointRows()) await drive(client, row);
    writeOrCompare(requests);
  });

  it("covers every SDK endpoint with a response fixture", () => {
    const missing = endpointRows()
      .map((row) => row.http_endpoint)
      .filter((endpoint) => !Object.keys(responseFixtures).includes(endpoint));
    expect(missing).toEqual([]);
  });

  it("records parsed response shapes for the complete corpus", async () => {
    const { Exa } = await import("../../src/index");
    const client = new Exa("dummy-api-key");
    const responses: unknown[] = [];
    for (const row of endpointRows()) {
      const before = requests.length;
      let outcome = "ok";
      let response: unknown = null;
      try {
        response = await resolve(
          client,
          row.namespace,
          row.method,
          row.http_endpoint
        )(...callArgs(row.http_endpoint, row.method));
      } catch (error) {
        outcome = `raised:${error instanceof Error ? error.constructor.name : "UnknownError"}`;
      }
      expect(requests.length).toBe(before + 1);
      const captured = requests[requests.length - 1];
      responses.push({
        mode: captured.mode,
        method: captured.method,
        path: new URL(captured.url).pathname,
        outcome,
        response: outcome === "ok" ? publicShape(response) : null,
      });
    }
    writeOrCompare(responses, responseGoldenPath);
  });

  it("pins streamSearch and streamAnswer SSE parsing", async () => {
    streaming.value = true;
    const { Exa } = await import("../../src/index");
    const client = new Exa("dummy-api-key");
    for (const stream of [
      client.streamSearch("conformance query"),
      client.streamAnswer("conformance question"),
    ]) {
      for await (const _chunk of stream) {
        break;
      }
    }
    expect(requests).toHaveLength(2);
  });

  it("pins stream flags on convenience methods", async () => {
    const { Exa } = await import("../../src/index");
    const client = new Exa("dummy-api-key");
    await expect(
      client.search("query", { stream: true } as any)
    ).rejects.toThrow("streamSearch");
    await expect(
      client.answer("question", { stream: true } as any)
    ).rejects.toThrow("streamAnswer");
  });

  it("returns the synthetic response payload through the public parser", async () => {
    responsePayload.value = {
      requestId: "request-1",
      results: [
        { id: "result-1", url: "https://example.com", title: "Example" },
      ],
    };
    const { Exa } = await import("../../src/index");
    const response = await new Exa("dummy-api-key").search("query");
    expect(response.requestId).toBe("request-1");
    expect(response.results[0]).toMatchObject({
      id: "result-1",
      title: "Example",
    });
  });
});
