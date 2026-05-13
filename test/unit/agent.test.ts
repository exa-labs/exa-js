import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import Exa from "../../src";
import { AGENT_BETA_HEADER } from "../../src/agent";
import {
  AgentRun,
  DeletedAgentRun,
  ListAgentRunEventsResponse,
  ListAgentRunsResponse,
} from "../../src/agent/types";
import { getProtectedClient } from "./helpers";

const AGENT_BETAS = [AGENT_BETA_HEADER];

function createSseResponse(chunks: string[]): Response {
  const stream = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(new TextEncoder().encode(chunk));
      }
      controller.close();
    },
  });
  return new Response(stream);
}

describe("Agent API", () => {
  let exa: Exa;

  const createMockRun = (): AgentRun => ({
    id: "agent_run_123",
    object: "agent_run",
    status: "completed",
    stopReason: "schema_satisfied",
    createdAt: "2026-05-07T18:31:00.000Z",
    completedAt: "2026-05-07T18:31:24.000Z",
    request: { query: "Find recent funding rounds." },
    output: {
      text: "Returned 1 company.",
      structured: { companies: [{ name: "Example AI" }] },
      grounding: [
        {
          field: "structured.companies[0].name",
          citations: [{ url: "https://example.com", title: "Example" }],
          score: 0.9,
          confidence: "high",
        },
      ],
    },
    usage: { agentComputeUnits: 100, searches: 2 },
    costDollars: { total: 0.02, agentCompute: 0.01, search: 0.01 },
  });

  beforeEach(() => {
    vi.resetAllMocks();
    exa = new Exa("test-api-key", "https://api.exa.ai");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("exposes Agent runs under the beta namespace", () => {
    expect(exa.beta.agent.runs).toBeDefined();
    expect((exa.beta.agent as any).run).toBeUndefined();
    expect((exa as any).agent).toBeUndefined();
  });

  it("creates an Agent run with explicit beta headers", async () => {
    const mockResponse = createMockRun();
    const runClient = getProtectedClient(exa.beta.agent.runs);
    const requestSpy = vi
      .spyOn(runClient, "request")
      .mockResolvedValueOnce(mockResponse);

    const params = {
      betas: AGENT_BETAS,
      query: "Find recent funding rounds.",
      systemPrompt: "Prefer primary sources.",
      input: { data: [{ company: "Example AI" }] },
      outputSchema: { type: "object" },
      effort: "high",
      metadata: { workflow: "funding-watch" },
    };
    const result = await exa.beta.agent.runs.create(params);

    const { betas, ...payload } = params;
    expect(requestSpy).toHaveBeenCalledWith("", betas, "POST", payload);
    expect(result).toEqual(mockResponse);
  });

  it("requires explicit betas for Agent calls", async () => {
    await expect(
      exa.beta.agent.runs.create({
        betas: [],
        query: "Find recent funding rounds.",
      })
    ).rejects.toThrow("betas");
  });

  it("requires explicit betas for plain JavaScript callers", async () => {
    await expect(
      (exa.beta.agent.runs as any).create({
        query: "Find recent funding rounds.",
      })
    ).rejects.toThrow("betas");
  });

  it("converts zod output schemas before creating an Agent run", async () => {
    const runClient = getProtectedClient(exa.beta.agent.runs);
    const requestSpy = vi
      .spyOn(runClient, "request")
      .mockResolvedValueOnce(createMockRun());

    await exa.beta.agent.runs.create({
      betas: AGENT_BETAS,
      query: "Find recent funding rounds.",
      outputSchema: z.object({
        companyName: z.string(),
      }),
    });

    const payload = requestSpy.mock.calls[0][3] as Record<string, any>;
    expect(payload.outputSchema.type).toBe("object");
    expect(payload.outputSchema.properties.companyName.type).toBe("string");
    expect(payload.betas).toBeUndefined();
  });

  it("accepts contact fields in output schemas", async () => {
    const runClient = getProtectedClient(exa.beta.agent.runs);
    const requestSpy = vi
      .spyOn(runClient, "request")
      .mockResolvedValueOnce(createMockRun());

    await exa.beta.agent.runs.create({
      betas: AGENT_BETAS,
      query:
        "Find people at AI infrastructure companies and return work emails when available.",
      outputSchema: {
        type: "object",
        properties: {
          people: {
            type: "array",
            maxItems: 10,
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                contact_email: { type: "string", format: "email" },
                linkedin_url: { type: "string", format: "uri" },
              },
            },
          },
        },
      },
    });

    const payload = requestSpy.mock.calls[0][3] as Record<string, any>;
    expect(payload.outputSchema.properties.people.maxItems).toBe(10);
    expect(
      payload.outputSchema.properties.people.items.properties.contact_email
        .format
    ).toBe("email");
    expect(payload.enrichments).toBeUndefined();
  });

  it("base client injects caller-provided beta headers", async () => {
    const requestSpy = vi
      .spyOn(exa, "request")
      .mockResolvedValueOnce(createMockRun());

    await exa.beta.agent.runs.get("agent_run_123", { betas: AGENT_BETAS });

    expect(requestSpy).toHaveBeenCalledWith(
      "/agent/runs/agent_run_123",
      "GET",
      undefined,
      undefined,
      { "Exa-Beta": AGENT_BETA_HEADER }
    );
  });

  it("lists Agent runs", async () => {
    const mockResponse: ListAgentRunsResponse = {
      object: "list",
      data: [createMockRun()],
      hasMore: false,
      nextCursor: null,
    };
    const runClient = getProtectedClient(exa.beta.agent.runs);
    const requestSpy = vi
      .spyOn(runClient, "request")
      .mockResolvedValueOnce(mockResponse);

    const result = await exa.beta.agent.runs.list({
      betas: AGENT_BETAS,
      limit: 10,
    });

    expect(requestSpy).toHaveBeenCalledWith("", AGENT_BETAS, "GET", undefined, {
      limit: 10,
    });
    expect(result).toEqual(mockResponse);
  });

  it("paginates through Agent runs with listAll and getAll", async () => {
    const runClient = getProtectedClient(exa.beta.agent.runs);
    const requestSpy = vi
      .spyOn(runClient, "request")
      .mockResolvedValueOnce({
        object: "list",
        data: [{ ...createMockRun(), id: "agent_run_1" }],
        hasMore: true,
        nextCursor: "cursor_2",
      })
      .mockResolvedValueOnce({
        object: "list",
        data: [{ ...createMockRun(), id: "agent_run_2" }],
        hasMore: false,
        nextCursor: null,
      })
      .mockResolvedValueOnce({
        object: "list",
        data: [{ ...createMockRun(), id: "agent_run_3" }],
        hasMore: false,
        nextCursor: null,
      });

    const listed = [];
    for await (const run of exa.beta.agent.runs.listAll({
      betas: AGENT_BETAS,
      limit: 1,
    })) {
      listed.push(run.id);
    }
    const collected = await exa.beta.agent.runs.getAll({
      betas: AGENT_BETAS,
      limit: 1,
    });

    expect(listed).toEqual(["agent_run_1", "agent_run_2"]);
    expect(collected.map((run) => run.id)).toEqual(["agent_run_3"]);
    expect(requestSpy).toHaveBeenNthCalledWith(
      1,
      "",
      AGENT_BETAS,
      "GET",
      undefined,
      {
        limit: 1,
        cursor: undefined,
      }
    );
    expect(requestSpy).toHaveBeenNthCalledWith(
      2,
      "",
      AGENT_BETAS,
      "GET",
      undefined,
      {
        limit: 1,
        cursor: "cursor_2",
      }
    );
  });

  it("cancels and deletes Agent runs", async () => {
    const cancelled: AgentRun = {
      ...createMockRun(),
      status: "cancelled",
      stopReason: "cancelled",
    };
    const deleted: DeletedAgentRun = {
      id: "agent_run_123",
      object: "agent_run.deleted",
      deleted: true,
    };
    const runClient = getProtectedClient(exa.beta.agent.runs);
    const requestSpy = vi
      .spyOn(runClient, "request")
      .mockResolvedValueOnce(cancelled)
      .mockResolvedValueOnce(deleted);

    expect(
      await exa.beta.agent.runs.cancel("agent_run_123", { betas: AGENT_BETAS })
    ).toEqual(cancelled);
    expect(
      await exa.beta.agent.runs.delete("agent_run_123", { betas: AGENT_BETAS })
    ).toEqual(deleted);
    expect(requestSpy).toHaveBeenNthCalledWith(
      1,
      "/agent_run_123/cancel",
      AGENT_BETAS,
      "POST"
    );
    expect(requestSpy).toHaveBeenNthCalledWith(
      2,
      "/agent_run_123",
      AGENT_BETAS,
      "DELETE"
    );
  });

  it("lists Agent run events", async () => {
    const mockResponse: ListAgentRunEventsResponse = {
      object: "list",
      data: [
        {
          id: "1",
          event: "agent_run.created",
          data: { id: "agent_run_123", status: "queued" },
          createdAt: "2026-05-07T18:31:00.000Z",
        },
      ],
      hasMore: false,
      nextCursor: null,
    };
    const eventsClient = getProtectedClient(exa.beta.agent.runs.events);
    const requestSpy = vi
      .spyOn(eventsClient, "request")
      .mockResolvedValueOnce(mockResponse);

    const result = await exa.beta.agent.runs.events.list("agent_run_123", {
      betas: AGENT_BETAS,
      limit: 20,
    });

    expect(requestSpy).toHaveBeenCalledWith(
      "/agent_run_123/events",
      AGENT_BETAS,
      "GET",
      undefined,
      { limit: 20 }
    );
    expect(result).toEqual(mockResponse);
  });

  it("streams created Agent run events with SSE headers", async () => {
    const response = createSseResponse([
      'id: 1\nevent: agent_run.created\ndata: {"id":"agent_run_123","status":"queued"}\n\n',
    ]);
    const rawRequestSpy = vi
      .spyOn(exa, "rawRequest")
      .mockResolvedValueOnce(response);

    const events = await exa.beta.agent.runs.create({
      betas: AGENT_BETAS,
      query: "Find companies.",
      stream: true,
    });

    const collected = [];
    for await (const event of events) {
      collected.push(event);
    }
    const reader = response.body?.getReader();
    reader?.releaseLock();

    expect(rawRequestSpy).toHaveBeenCalledWith(
      "/agent/runs",
      "POST",
      { query: "Find companies." },
      undefined,
      {
        "Exa-Beta": AGENT_BETA_HEADER,
        Accept: "text/event-stream",
      }
    );
    expect(collected).toEqual([
      {
        id: "1",
        event: "agent_run.created",
        data: { id: "agent_run_123", status: "queued" },
      },
    ]);
  });

  it("throws when streaming Agent run creation returns an error", async () => {
    vi.spyOn(exa, "rawRequest").mockResolvedValueOnce(
      new Response("beta header missing", { status: 400 })
    );

    await expect(
      exa.beta.agent.runs.create({
        betas: AGENT_BETAS,
        query: "Find companies.",
        stream: true,
      })
    ).rejects.toThrow("beta header missing");
  });

  it("cancels streaming Agent responses when callers stop early", async () => {
    const cancelSpy = vi.fn();
    const response = new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(
            new TextEncoder().encode(
              'id: 1\nevent: agent_run.created\ndata: {"id":"agent_run_123"}\n\n'
            )
          );
        },
        cancel: cancelSpy,
      })
    );
    vi.spyOn(exa, "rawRequest").mockResolvedValueOnce(response);

    const events = await exa.beta.agent.runs.create({
      betas: AGENT_BETAS,
      query: "Find companies.",
      stream: true,
    });

    for await (const event of events) {
      expect(event.event).toBe("agent_run.created");
      break;
    }

    expect(cancelSpy).toHaveBeenCalledOnce();
  });

  it("polls until an Agent run reaches a terminal status", async () => {
    vi.useFakeTimers();
    const getSpy = vi
      .spyOn(exa.beta.agent.runs, "get")
      .mockResolvedValueOnce({ ...createMockRun(), status: "running" })
      .mockResolvedValueOnce({ ...createMockRun(), status: "completed" });

    const resultPromise = exa.beta.agent.runs.pollUntilFinished(
      "agent_run_123",
      {
        betas: AGENT_BETAS,
        pollInterval: 5,
        timeoutMs: 1000,
      }
    );

    await vi.advanceTimersByTimeAsync(5);

    await expect(resultPromise).resolves.toMatchObject({
      id: "agent_run_123",
      status: "completed",
    });
    expect(getSpy).toHaveBeenCalledTimes(2);
  });

  it("throws when Agent polling times out", async () => {
    vi.useFakeTimers();
    vi.spyOn(exa.beta.agent.runs, "get").mockResolvedValue({
      ...createMockRun(),
      status: "running",
    });

    const resultPromise = exa.beta.agent.runs.pollUntilFinished(
      "agent_run_123",
      {
        betas: AGENT_BETAS,
        pollInterval: 5,
        timeoutMs: 1,
      }
    );
    const rejection = expect(resultPromise).rejects.toThrow(
      "Agent run agent_run_123 did not complete within 1ms"
    );

    await vi.advanceTimersByTimeAsync(10);

    await rejection;
  });

  it("merges default and per-request headers in rawRequest", async () => {
    vi.resetModules();
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}"));
    vi.stubGlobal("fetch", fetchMock);
    const { default: FreshExa } = await import("../../src");
    const freshExa = new FreshExa("test-api-key", "https://api.exa.ai");

    await freshExa.rawRequest(
      "/agent/runs",
      "POST",
      { query: "Find companies." },
      undefined,
      {
        "Exa-Beta": AGENT_BETA_HEADER,
        Accept: "text/event-stream",
      }
    );

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe("test-api-key");
    expect(headers["content-type"]).toBe("application/json");
    expect(headers["Exa-Beta"]).toBe(AGENT_BETA_HEADER);
    expect(headers.Accept).toBe("text/event-stream");
  });
});
