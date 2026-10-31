/** The cost an `/answer` stream reports in its final event is yielded last. */
import { expect, it, vi } from "vitest";
import Exa from "../../src";

const ANSWER_STREAM = [
  'data: {"choices":[{"index":0,"delta":{"content":"Paris"},"finish_reason":null}]}',
  'data: {"costDollars":{"total":0.005},"requestId":"req-1"}',
  "data: [DONE]",
].join("\n\n");

it("streamAnswer yields the cost on a final chunk of its own", async () => {
  const exa = new Exa("test-api-key", "https://api.exa.ai");
  vi.spyOn(exa, "rawRequest").mockResolvedValueOnce(
    new Response(ANSWER_STREAM, {
      headers: { "content-type": "text/event-stream" },
    })
  );

  const chunks = [];
  for await (const chunk of exa.streamAnswer("q")) {
    chunks.push(chunk);
  }

  expect(chunks).toEqual([
    { content: "Paris", citations: undefined },
    { costDollars: { total: 0.005 } },
  ]);
});
