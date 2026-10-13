/**
 * `userIdentifier` attributes a request to one end user of the caller's
 * application. These tests check that every method that calls `/search`,
 * `/contents`, `/answer` or `/agent/runs` sends it as a top-level body field
 * when given, and leaves it out when not. They make no HTTP calls.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import Exa from "../../src";
import { AGENT_BETA_HEADER } from "../../src/agent";
import type { AgentRun } from "../../src/agent/types";
import { getProtectedClient } from "./helpers";

const USER_IDENTIFIER = "7f3a9c52-1d4e-4b8a-9e60-2c5d8a1f0b37";

const SEARCH_RESPONSE = { results: [], requestId: "req-123" };
const ANSWER_RESPONSE = { answer: "Paris", citations: [], requestId: "req-1" };

function emptySseResponse(): Response {
  return new Response(
    new ReadableStream({
      start(controller) {
        controller.close();
      },
    }),
    { status: 200, headers: { "content-type": "text/event-stream" } }
  );
}

function completedRun(): AgentRun {
  return { id: "agent_run_123", status: "completed" };
}

/** The JSON body of the nth call to a `request`/`rawRequest` spy. */
function bodyOf(
  spy: { mock: { calls: unknown[][] } },
  call = 0
): Record<string, unknown> {
  return spy.mock.calls[call][2] as Record<string, unknown>;
}

describe("userIdentifier", () => {
  let exa: Exa;

  beforeEach(() => {
    vi.resetAllMocks();
    exa = new Exa("test-api-key", "https://api.exa.ai");
  });

  it("search sends it at the top level of the /search body", async () => {
    const requestSpy = vi
      .spyOn(exa, "request")
      .mockResolvedValue(SEARCH_RESPONSE);

    await exa.search("hottest AI startups", {
      userIdentifier: USER_IDENTIFIER,
      contents: { highlights: true },
    });
    await exa.search("hottest AI startups", { type: "deep" });

    expect(requestSpy).toHaveBeenNthCalledWith(1, "/search", "POST", {
      query: "hottest AI startups",
      userIdentifier: USER_IDENTIFIER,
      contents: { highlights: true },
    });
    expect(bodyOf(requestSpy, 1)).not.toHaveProperty("userIdentifier");
  });

  it("streamSearch sends it in the streaming /search body", async () => {
    const rawRequestSpy = vi
      .spyOn(exa, "rawRequest")
      .mockResolvedValueOnce(emptySseResponse());

    for await (const _chunk of exa.streamSearch("battery breakthroughs", {
      userIdentifier: USER_IDENTIFIER,
    })) {
      // drain
    }

    expect(rawRequestSpy.mock.calls[0][0]).toBe("/search");
    expect(bodyOf(rawRequestSpy)).toMatchObject({
      userIdentifier: USER_IDENTIFIER,
      stream: true,
    });
  });

  it("searchAndContents keeps it at the top level, outside contents", async () => {
    const requestSpy = vi
      .spyOn(exa, "request")
      .mockResolvedValueOnce(SEARCH_RESPONSE);

    await exa.searchAndContents("hottest AI startups", {
      text: true,
      userIdentifier: USER_IDENTIFIER,
    });

    expect(requestSpy).toHaveBeenCalledWith("/search", "POST", {
      query: "hottest AI startups",
      contents: { text: true },
      userIdentifier: USER_IDENTIFIER,
    });
  });

  it("getContents sends it at the top level of the /contents body", async () => {
    const requestSpy = vi
      .spyOn(exa, "request")
      .mockResolvedValue(SEARCH_RESPONSE);

    await exa.getContents(["https://example.com"], {
      text: true,
      userIdentifier: USER_IDENTIFIER,
    });
    await exa.getContents("https://example.com", {
      userIdentifier: USER_IDENTIFIER,
    });
    await exa.getContents("https://example.com");

    expect(requestSpy).toHaveBeenNthCalledWith(1, "/contents", "POST", {
      urls: ["https://example.com"],
      text: true,
      userIdentifier: USER_IDENTIFIER,
    });
    expect(requestSpy).toHaveBeenNthCalledWith(2, "/contents", "POST", {
      urls: ["https://example.com"],
      userIdentifier: USER_IDENTIFIER,
    });
    expect(bodyOf(requestSpy, 2)).not.toHaveProperty("userIdentifier");
  });

  it("answer sends it in the /answer body", async () => {
    const requestSpy = vi
      .spyOn(exa, "request")
      .mockResolvedValue(ANSWER_RESPONSE);

    await exa.answer("What is the capital of France?", {
      userIdentifier: USER_IDENTIFIER,
    });
    await exa.answer("What is the capital of France?");

    expect(requestSpy.mock.calls[0][0]).toBe("/answer");
    expect(bodyOf(requestSpy)).toMatchObject({
      query: "What is the capital of France?",
      stream: false,
      userIdentifier: USER_IDENTIFIER,
    });
    // An omitted field is undefined, which JSON.stringify drops from the body.
    expect(bodyOf(requestSpy, 1).userIdentifier).toBeUndefined();
  });

  it("streamAnswer sends it in the streaming /answer body", async () => {
    const rawRequestSpy = vi
      .spyOn(exa, "rawRequest")
      .mockResolvedValueOnce(emptySseResponse());

    for await (const _chunk of exa.streamAnswer(
      "What is the capital of France?",
      { userIdentifier: USER_IDENTIFIER }
    )) {
      // drain
    }

    expect(rawRequestSpy.mock.calls[0][0]).toBe("/answer");
    expect(bodyOf(rawRequestSpy)).toMatchObject({
      userIdentifier: USER_IDENTIFIER,
      stream: true,
    });
  });

  it("agent.runs.create sends it in the /agent/runs body", async () => {
    const requestSpy = vi
      .spyOn(getProtectedClient(exa.agent.runs), "request")
      .mockResolvedValue(completedRun());

    await exa.agent.runs.create({
      query: "Find companies building browser automation tools.",
      userIdentifier: USER_IDENTIFIER,
    });
    await exa.agent.runs.create({ query: "Find companies." });

    expect(requestSpy).toHaveBeenNthCalledWith(1, "", "POST", {
      query: "Find companies building browser automation tools.",
      userIdentifier: USER_IDENTIFIER,
    });
    expect(bodyOf(requestSpy, 1)).not.toHaveProperty("userIdentifier");
  });

  it("agent.runs.create sends it when streaming events", async () => {
    const rawRequestSpy = vi
      .spyOn(exa, "rawRequest")
      .mockResolvedValueOnce(emptySseResponse());

    await exa.agent.runs.create({
      query: "Find companies.",
      userIdentifier: USER_IDENTIFIER,
      stream: true,
    });

    expect(rawRequestSpy).toHaveBeenCalledWith(
      "/agent/runs",
      "POST",
      { query: "Find companies.", userIdentifier: USER_IDENTIFIER },
      undefined,
      { Accept: "text/event-stream" }
    );
  });

  it("agent.runs.createAndWait sends it when creating the run", async () => {
    const requestSpy = vi
      .spyOn(getProtectedClient(exa.agent.runs), "request")
      .mockResolvedValue(completedRun());

    await exa.agent.runs.createAndWait(
      { query: "Find companies.", userIdentifier: USER_IDENTIFIER },
      { pollInterval: 5, timeoutMs: 1000 }
    );

    expect(requestSpy).toHaveBeenNthCalledWith(1, "", "POST", {
      query: "Find companies.",
      userIdentifier: USER_IDENTIFIER,
    });
  });

  it("beta.agent.runs.create sends it in the body, not as a header", async () => {
    const requestSpy = vi
      .spyOn(getProtectedClient(exa.beta.agent.runs), "request")
      .mockResolvedValueOnce(completedRun());

    await exa.beta.agent.runs.create({
      betas: [AGENT_BETA_HEADER],
      query: "Find companies.",
      userIdentifier: USER_IDENTIFIER,
    });

    expect(requestSpy).toHaveBeenCalledWith(
      "",
      "POST",
      { query: "Find companies.", userIdentifier: USER_IDENTIFIER },
      undefined,
      { "Exa-Beta": AGENT_BETA_HEADER }
    );
  });
});
