/**
 * `streamSearch` and `streamAnswer` when the API reports a failure inside an
 * event stream that has already started, served by a local HTTP server.
 */
import { createServer, type RequestListener, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import Exa, { ExaError, type AnswerStreamChunk } from "../../src";

const servers: Server[] = [];

/** Serves `handler` on a loopback port and returns a client for it. */
async function start(handler: RequestListener): Promise<Exa> {
  const server = createServer(handler);
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return new Exa("test-key", `http://127.0.0.1:${port}`, {
    warnings: "silent",
  });
}

afterEach(async () => {
  for (const server of servers.splice(0)) {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
});

const SEARCH_ERROR = {
  type: "error",
  error: { message: "Stream failed" },
  requestId: "req_stream",
};
const ANSWER_ERROR = {
  tag: "ERROR",
  payload: {
    error: { code: 503, message: "Stream failed" },
    requestId: "req_stream",
  },
};

describe.each([
  { method: "streamSearch", path: "/search", event: SEARCH_ERROR, status: 500 },
  { method: "streamAnswer", path: "/answer", event: ANSWER_ERROR, status: 503 },
])("$method with an error event", ({ method, path, event, status }) => {
  it.each([
    ["[DONE]", "\n\ndata: [DONE]\n\n"],
    ["the end of the body", ""],
  ])(
    "yields the earlier chunks, then rejects with ExaError when the event is followed by %s",
    async (_ending, tail) => {
      const exa = await start((request, response) => {
        request.resume();
        response.writeHead(200, { "content-type": "text/event-stream" });
        response.end(
          'data: {"choices":[{"delta":{"content":"Before failure"}}]}\n\n' +
            `data: ${JSON.stringify(event)}${tail}`
        );
      });
      const stream: AsyncGenerator<AnswerStreamChunk> =
        method === "streamSearch"
          ? exa.streamSearch("query")
          : exa.streamAnswer("query");

      const chunks: AnswerStreamChunk[] = [];
      const error = await (async () => {
        for await (const chunk of stream) chunks.push(chunk);
      })().catch((rejection: unknown) => rejection);

      expect(chunks).toEqual([{ content: "Before failure" }]);
      expect(error).toBeInstanceOf(ExaError);
      expect(error).toMatchObject({
        statusCode: status,
        message: "Stream failed",
        requestId: "req_stream",
        path,
      });
    }
  );
});

it("rejects and closes the connection when the server keeps it open after an error event", async () => {
  let closed!: () => void;
  const connectionClosed = new Promise<void>((resolve) => {
    closed = resolve;
  });
  const exa = await start((request, response) => {
    request.resume();
    response.on("close", closed);
    response.writeHead(200, { "content-type": "text/event-stream" });
    response.write(`data: ${JSON.stringify(SEARCH_ERROR)}\n\n`);
  });

  await expect(exa.streamSearch("query").next()).rejects.toMatchObject({
    name: "ExaError",
    message: "Stream failed",
    requestId: "req_stream",
  });
  await connectionClosed;
});

it("keeps the tag of a refused search stream's error event", async () => {
  const refused = {
    ...SEARCH_ERROR,
    error: {
      message: "Not available in this region",
      tag: "PROVIDER_UNAVAILABLE_IN_REGION",
    },
  };
  const exa = await start((request, response) => {
    request.resume();
    response.writeHead(200, { "content-type": "text/event-stream" });
    response.end(`data: ${JSON.stringify(refused)}\n\ndata: [DONE]\n\n`);
  });

  await expect(exa.streamSearch("query").next()).rejects.toMatchObject({
    name: "ExaError",
    message: "Not available in this region",
    requestId: "req_stream",
    tag: "PROVIDER_UNAVAILABLE_IN_REGION",
  });
});
