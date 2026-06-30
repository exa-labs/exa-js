import {
  afterEach,
  beforeEach,
  describe,
  expect,
  expectTypeOf,
  it,
  vi,
} from "vitest";
import { z } from "zod";
import Exa from "../../src";
import {
  AgentBetaClient,
  AgentClient,
  AGENT_BETA_HEADER,
  BetaClient,
} from "../../src/agent";
import {
  AgentRun,
  DeletedAgentRun,
  ListAgentRunEventsResponse,
  ListAgentRunsResponse,
} from "../../src/agent/types";
import { getProtectedClient } from "./helpers";

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
    usage: { agentComputeUnits: 0.1, searches: 2 },
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

  it("exposes Agent runs under the primary namespace", () => {
    expect(exa.agent.runs).toBeDefined();
    expect((exa.agent as any).run).toBeUndefined();
  });

  it("keeps the beta Agent namespace as a compatibility wrapper", () => {
    expect(AgentBetaClient).not.toBe(AgentClient);
    expect(exa.agent).toBeInstanceOf(AgentClient);
    expect(exa.beta.agent).toBeInstanceOf(AgentBetaClient);
    expect(exa.beta.agent).toBeInstanceOf(AgentClient);
    expect(exa.beta.agent).not.toBe(exa.agent);
    expect(exa.beta.agent.runs).not.toBe(exa.agent.runs);
    expect(new AgentBetaClient(exa).runs).toBeDefined();
    expect(new AgentBetaClient(exa.agent).runs).toBeDefined();
    expect(new BetaClient(exa).agent.runs).toBeDefined();
    expect(new BetaClient(exa.agent).agent.runs).toBeDefined();

    if (false) {
      // @ts-expect-error betas are only accepted through exa.beta.agent.
      exa.agent.runs.create({ query: "Find companies.", betas: [] });
      exa.beta.agent.runs.create({
        query: "Find companies.",
        betas: [AGENT_BETA_HEADER],
      });
      // @ts-expect-error betas are only accepted through exa.beta.agent.
      exa.agent.runs.get("agent_run_123", { betas: [] });
      exa.beta.agent.runs.get("agent_run_123", {
        betas: [AGENT_BETA_HEADER],
      });
      new AgentBetaClient(exa).runs.create({
        query: "Find companies.",
        betas: [AGENT_BETA_HEADER],
      });
    }
  });

  it("creates an Agent run without beta headers", async () => {
    const mockResponse = createMockRun();
    const runClient = getProtectedClient(exa.agent.runs);
    const requestSpy = vi
      .spyOn(runClient, "request")
      .mockResolvedValueOnce(mockResponse);

    const params = {
      query: "Find recent funding rounds.",
      systemPrompt: "Prefer primary sources.",
      input: { data: [{ company: "Example AI" }] },
      outputSchema: { type: "object" as const },
      effort: "minimal" as const,
      metadata: { workflow: "funding-watch" },
    };
    const result = await exa.agent.runs.create(params);

    expect(requestSpy).toHaveBeenCalledWith("", "POST", params);
    expect(result).toEqual(mockResponse);
  });

  it("passes Exa Connect data sources through and round-trips per-provider usage", async () => {
    // Typing this literal as AgentRun proves AgentUsage/AgentCostDollars accept
    // the new per-provider `dataSources` maps at compile time.
    const mockResponse: AgentRun = {
      ...createMockRun(),
      usage: { agentComputeUnits: 0.1, dataSources: { financial_datasets: 3 } },
      costDollars: { total: 0.05, dataSources: { financial_datasets: 0.04 } },
    };
    const runClient = getProtectedClient(exa.agent.runs);
    const requestSpy = vi
      .spyOn(runClient, "request")
      .mockResolvedValueOnce(mockResponse);

    const result = await exa.agent.runs.create({
      query: "Find recent financials for Acme.",
      dataSources: [
        { provider: "financial_datasets" },
        // provider is a plain string, so any provider slug is accepted.
        { provider: "custom_provider" },
      ],
    });

    const payload = requestSpy.mock.calls[0][2] as Record<string, any>;
    expect(payload.dataSources).toEqual([
      { provider: "financial_datasets" },
      { provider: "custom_provider" },
    ]);
    expect(result).toEqual(mockResponse);
  });

  it("sends legacy beta values as headers when creating an Agent run from the beta namespace", async () => {
    const runClient = getProtectedClient(exa.beta.agent.runs);
    const requestSpy = vi
      .spyOn(runClient, "request")
      .mockResolvedValueOnce(createMockRun());

    await exa.beta.agent.runs.create({
      betas: [AGENT_BETA_HEADER],
      query: "Find recent funding rounds.",
    });

    const payload = requestSpy.mock.calls[0][2] as Record<string, any>;
    expect(payload).toEqual({ query: "Find recent funding rounds." });
    expect(requestSpy).toHaveBeenCalledWith(
      "",
      "POST",
      { query: "Find recent funding rounds." },
      undefined,
      { "Exa-Beta": AGENT_BETA_HEADER }
    );
  });

  it("omits legacy beta headers when beta values are empty", async () => {
    const runClient = getProtectedClient(exa.beta.agent.runs);
    const requestSpy = vi
      .spyOn(runClient, "request")
      .mockResolvedValueOnce(createMockRun());

    await exa.beta.agent.runs.create({
      betas: [],
      query: "Find recent funding rounds.",
    });

    expect(requestSpy).toHaveBeenCalledWith(
      "",
      "POST",
      { query: "Find recent funding rounds." },
      undefined,
      undefined
    );
  });

  it("converts zod output schemas before creating an Agent run", async () => {
    const runClient = getProtectedClient(exa.agent.runs);
    const requestSpy = vi
      .spyOn(runClient, "request")
      .mockResolvedValueOnce(createMockRun());

    await exa.agent.runs.create({
      query: "Find recent funding rounds.",
      outputSchema: z.object({
        companyName: z.string(),
      }),
    });

    const payload = requestSpy.mock.calls[0][2] as Record<string, any>;
    expect(payload.outputSchema.type).toBe("object");
    expect(payload.outputSchema.properties.companyName.type).toBe("string");
    expect(payload.betas).toBeUndefined();
  });

  it("preserves typed run fields when outputSchema is provided", async () => {
    const runClient = getProtectedClient(exa.agent.runs);
    vi.spyOn(runClient, "request").mockResolvedValueOnce(createMockRun());
    vi.spyOn(exa.agent.runs, "get").mockResolvedValueOnce(createMockRun());

    const run = await exa.agent.runs.create({
      query: "Find recent funding rounds.",
      outputSchema: z.object({
        companies: z.array(
          z.object({
            name: z.string(),
          })
        ),
      }),
    });

    expectTypeOf(run.id).toEqualTypeOf<string>();
    expectTypeOf(run.status).toEqualTypeOf<AgentRun["status"]>();
    expectTypeOf(run.output?.structured).toEqualTypeOf<
      { companies: { name: string }[] } | undefined
    >();

    const completedRun = await exa.agent.runs.pollUntilFinished(run.id);
    expect(completedRun.id).toBe("agent_run_123");
  });

  it("accepts contact fields in output schemas", async () => {
    const runClient = getProtectedClient(exa.agent.runs);
    const requestSpy = vi
      .spyOn(runClient, "request")
      .mockResolvedValueOnce(createMockRun());

    await exa.agent.runs.create({
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

    const payload = requestSpy.mock.calls[0][2] as Record<string, any>;
    expect(payload.outputSchema.properties.people.maxItems).toBe(10);
    expect(
      payload.outputSchema.properties.people.items.properties.contact_email
        .format
    ).toBe("email");
    expect(payload.enrichments).toBeUndefined();
  });

  it("base client does not inject beta headers", async () => {
    const requestSpy = vi
      .spyOn(exa, "request")
      .mockResolvedValueOnce(createMockRun());

    await exa.agent.runs.get("agent_run_123");

    expect(requestSpy).toHaveBeenCalledWith(
      "/agent/runs/agent_run_123",
      "GET",
      undefined,
      undefined,
      undefined
    );
  });

  it("lists Agent runs", async () => {
    const mockResponse: ListAgentRunsResponse = {
      object: "list",
      data: [createMockRun()],
      hasMore: false,
      nextCursor: null,
    };
    const runClient = getProtectedClient(exa.agent.runs);
    const requestSpy = vi
      .spyOn(runClient, "request")
      .mockResolvedValueOnce(mockResponse);

    const result = await exa.agent.runs.list({ limit: 10 });

    expect(requestSpy).toHaveBeenCalledWith("", "GET", undefined, {
      limit: 10,
    });
    expect(result).toEqual(mockResponse);
  });

  it("lists Agent runs with legacy beta headers from the beta namespace", async () => {
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
      betas: [AGENT_BETA_HEADER],
      limit: 10,
    });

    expect(requestSpy).toHaveBeenCalledWith(
      "",
      "GET",
      undefined,
      { limit: 10 },
      { "Exa-Beta": AGENT_BETA_HEADER }
    );
    expect(result).toEqual(mockResponse);
  });

  it("paginates through Agent runs with listAll and getAll", async () => {
    const runClient = getProtectedClient(exa.agent.runs);
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
    for await (const run of exa.agent.runs.listAll({
      limit: 1,
    })) {
      listed.push(run.id);
    }
    const collected = await exa.agent.runs.getAll({
      limit: 1,
    });

    expect(listed).toEqual(["agent_run_1", "agent_run_2"]);
    expect(collected.map((run) => run.id)).toEqual(["agent_run_3"]);
    expect(requestSpy).toHaveBeenNthCalledWith(1, "", "GET", undefined, {
      limit: 1,
      cursor: undefined,
    });
    expect(requestSpy).toHaveBeenNthCalledWith(2, "", "GET", undefined, {
      limit: 1,
      cursor: "cursor_2",
    });
  });

  it("preserves legacy beta headers while paginating through the beta namespace", async () => {
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
      });

    const listed = [];
    for await (const run of exa.beta.agent.runs.listAll({
      betas: [AGENT_BETA_HEADER],
      limit: 1,
    })) {
      listed.push(run.id);
    }

    expect(listed).toEqual(["agent_run_1", "agent_run_2"]);
    expect(requestSpy).toHaveBeenNthCalledWith(
      1,
      "",
      "GET",
      undefined,
      {
        limit: 1,
        cursor: undefined,
      },
      { "Exa-Beta": AGENT_BETA_HEADER }
    );
    expect(requestSpy).toHaveBeenNthCalledWith(
      2,
      "",
      "GET",
      undefined,
      {
        limit: 1,
        cursor: "cursor_2",
      },
      { "Exa-Beta": AGENT_BETA_HEADER }
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
    const runClient = getProtectedClient(exa.agent.runs);
    const requestSpy = vi
      .spyOn(runClient, "request")
      .mockResolvedValueOnce(cancelled)
      .mockResolvedValueOnce(deleted);

    expect(await exa.agent.runs.cancel("agent_run_123")).toEqual(cancelled);
    expect(await exa.agent.runs.delete("agent_run_123")).toEqual(deleted);
    expect(requestSpy).toHaveBeenNthCalledWith(
      1,
      "/agent_run_123/cancel",
      "POST"
    );
    expect(requestSpy).toHaveBeenNthCalledWith(2, "/agent_run_123", "DELETE");
  });

  it("gets, cancels, and deletes Agent runs with legacy beta headers from the beta namespace", async () => {
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
      .mockResolvedValueOnce(createMockRun())
      .mockResolvedValueOnce(cancelled)
      .mockResolvedValueOnce(deleted);

    await exa.beta.agent.runs.get("agent_run_123", {
      betas: [AGENT_BETA_HEADER],
    });
    await exa.beta.agent.runs.cancel("agent_run_123", {
      betas: [AGENT_BETA_HEADER],
    });
    await exa.beta.agent.runs.delete("agent_run_123", {
      betas: [AGENT_BETA_HEADER],
    });

    expect(requestSpy).toHaveBeenNthCalledWith(
      1,
      "/agent_run_123",
      "GET",
      undefined,
      undefined,
      { "Exa-Beta": AGENT_BETA_HEADER }
    );
    expect(requestSpy).toHaveBeenNthCalledWith(
      2,
      "/agent_run_123/cancel",
      "POST",
      undefined,
      undefined,
      { "Exa-Beta": AGENT_BETA_HEADER }
    );
    expect(requestSpy).toHaveBeenNthCalledWith(
      3,
      "/agent_run_123",
      "DELETE",
      undefined,
      undefined,
      { "Exa-Beta": AGENT_BETA_HEADER }
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
    const eventsClient = getProtectedClient(exa.agent.runs.events);
    const requestSpy = vi
      .spyOn(eventsClient, "request")
      .mockResolvedValueOnce(mockResponse);

    const result = await exa.agent.runs.events.list("agent_run_123", {
      limit: 20,
    });

    expect(requestSpy).toHaveBeenCalledWith(
      "/agent_run_123/events",
      "GET",
      undefined,
      { limit: 20 }
    );
    expect(result).toEqual(mockResponse);
  });

  it("lists Agent run events with legacy beta headers from the beta namespace", async () => {
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
      betas: [AGENT_BETA_HEADER],
      limit: 20,
    });

    expect(requestSpy).toHaveBeenCalledWith(
      "/agent_run_123/events",
      "GET",
      undefined,
      { limit: 20 },
      { "Exa-Beta": AGENT_BETA_HEADER }
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

    const events = await exa.agent.runs.create({
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

  it("streams created Agent run events with SSE and legacy beta headers from the beta namespace", async () => {
    const response = createSseResponse([
      'id: 1\nevent: agent_run.created\ndata: {"id":"agent_run_123","status":"queued"}\n\n',
    ]);
    const rawRequestSpy = vi
      .spyOn(exa, "rawRequest")
      .mockResolvedValueOnce(response);

    const events = await exa.beta.agent.runs.create({
      betas: [AGENT_BETA_HEADER],
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
      new Response("stream request failed", { status: 400 })
    );

    await expect(
      exa.agent.runs.create({
        query: "Find companies.",
        stream: true,
      })
    ).rejects.toThrow("stream request failed");
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

    const events = await exa.agent.runs.create({
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
      .spyOn(exa.agent.runs, "get")
      .mockResolvedValueOnce({ ...createMockRun(), status: "running" })
      .mockResolvedValueOnce({ ...createMockRun(), status: "completed" });

    const resultPromise = exa.agent.runs.pollUntilFinished("agent_run_123", {
      pollInterval: 5,
      timeoutMs: 1000,
    });

    await vi.advanceTimersByTimeAsync(5);

    await expect(resultPromise).resolves.toMatchObject({
      id: "agent_run_123",
      status: "completed",
    });
    expect(getSpy).toHaveBeenCalledTimes(2);
  });

  it("polls with legacy beta headers from the beta namespace", async () => {
    vi.useFakeTimers();
    const runClient = getProtectedClient(exa.beta.agent.runs);
    const requestSpy = vi
      .spyOn(runClient, "request")
      .mockResolvedValueOnce({ ...createMockRun(), status: "running" })
      .mockResolvedValueOnce({ ...createMockRun(), status: "completed" });

    const resultPromise = exa.beta.agent.runs.pollUntilFinished(
      "agent_run_123",
      {
        betas: [AGENT_BETA_HEADER],
        pollInterval: 5,
        timeoutMs: 1000,
      }
    );

    await vi.advanceTimersByTimeAsync(5);

    await expect(resultPromise).resolves.toMatchObject({
      id: "agent_run_123",
      status: "completed",
    });
    expect(requestSpy).toHaveBeenNthCalledWith(
      1,
      "/agent_run_123",
      "GET",
      undefined,
      undefined,
      { "Exa-Beta": AGENT_BETA_HEADER }
    );
    expect(requestSpy).toHaveBeenNthCalledWith(
      2,
      "/agent_run_123",
      "GET",
      undefined,
      undefined,
      { "Exa-Beta": AGENT_BETA_HEADER }
    );
  });

  it("throws when Agent polling times out", async () => {
    vi.useFakeTimers();
    vi.spyOn(exa.agent.runs, "get").mockResolvedValue({
      ...createMockRun(),
      status: "running",
    });

    const resultPromise = exa.agent.runs.pollUntilFinished("agent_run_123", {
      pollInterval: 5,
      timeoutMs: 1,
    });
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
        Accept: "text/event-stream",
      }
    );

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe("test-api-key");
    expect(headers["content-type"]).toBe("application/json");
    expect(headers["Exa-Beta"]).toBeUndefined();
    expect(headers.Accept).toBe("text/event-stream");
  });
});
