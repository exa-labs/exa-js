/**
 * Client for the Exa Agent API.
 */

import { ZodSchema } from "zod";
import { Exa } from "../index";
import { ExaError } from "../errors";
import { isZodSchema, zodToJsonSchema } from "../zod-utils";
import { AgentBaseClient } from "./base";
import {
  AgentBetaOptions,
  AgentCreateOptions,
  AgentEvent,
  AgentRun,
  AgentRunTyped,
  CreateAgentRunParams,
  DeletedAgentRun,
  ListAgentRunEventsParams,
  ListAgentRunEventsResponse,
  ListAgentRunsParams,
  ListAgentRunsResponse,
} from "./types";

type WithBetaOptions<T> = T & AgentBetaOptions;

function headersForBetas(betas?: string[]): Record<string, string> | undefined {
  const betaValues = betas?.filter(Boolean);
  if (!betaValues?.length) return undefined;
  return { "Exa-Beta": betaValues.join(",") };
}

function buildAgentRunPayload<T>(params: AgentCreateOptions<T>): {
  stream?: boolean;
  payload: Record<string, unknown>;
} {
  const { stream, outputSchema, ...rest } = params;
  let schema = outputSchema;
  if (schema && isZodSchema(schema)) {
    schema = zodToJsonSchema(schema as ZodSchema<T>);
  }

  const payload: Record<string, unknown> = { ...rest };
  if (schema) {
    payload.outputSchema = schema;
  }

  return { stream, payload };
}

async function* streamAgentEvents(
  response: Response
): AsyncGenerator<AgentEvent> {
  if (!response.body) {
    throw new Error("No response body for SSE stream");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let doneReading = false;

  const processPart = (part: string): AgentEvent | null => {
    const event: Partial<AgentEvent> = {};
    const dataLines: string[] = [];

    for (const line of part.split("\n")) {
      if (!line || !line.includes(":")) continue;
      const [field, ...rest] = line.split(":");
      const value = rest.join(":").replace(/^ /, "");

      if (field === "id") event.id = value;
      if (field === "event") event.event = value;
      if (field === "data") dataLines.push(value);
    }

    if (!event.event || dataLines.length === 0) return null;

    try {
      event.data = JSON.parse(dataLines.join("\n"));
    } catch {
      event.data = { value: dataLines.join("\n") };
    }

    return event as AgentEvent;
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        doneReading = true;
        break;
      }
      buffer += decoder.decode(value, { stream: true });

      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        const event = processPart(part);
        if (event) yield event;
      }
    }

    if (buffer.trim()) {
      const event = processPart(buffer.trim());
      if (event) yield event;
    }
  } finally {
    if (!doneReading) {
      await reader.cancel();
    }
    reader.releaseLock();
  }
}

export class AgentRunEventsClient extends AgentBaseClient {
  /**
   * List stored events for an Agent run.
   */
  async list(
    runId: string,
    options?: ListAgentRunEventsParams
  ): Promise<ListAgentRunEventsResponse> {
    const params = this.buildPaginationParams(options);
    return this.request<ListAgentRunEventsResponse>(
      `/${runId}/events`,
      "GET",
      undefined,
      params
    );
  }
}

export class AgentRunsClient extends AgentBaseClient {
  /**
   * Client for Agent run events.
   */
  events: AgentRunEventsClient;

  constructor(client: Exa) {
    super(client);
    this.events = new AgentRunEventsClient(client);
  }

  /**
   * Create an Agent run.
   */
  async create<T>(
    params: AgentCreateOptions<T> & { stream: true }
  ): Promise<AsyncGenerator<AgentEvent>>;
  async create<T>(
    params: AgentCreateOptions<T> & { stream?: false }
  ): Promise<AgentRunTyped<T>>;
  async create(params: CreateAgentRunParams): Promise<AgentRun>;
  async create<T>(
    params: AgentCreateOptions<T>
  ): Promise<AgentRun | AgentRunTyped<T> | AsyncGenerator<AgentEvent>> {
    const { stream, payload } = buildAgentRunPayload(params);

    if (stream) {
      const response = await this.rawRequest("", "POST", payload, undefined, {
        Accept: "text/event-stream",
      });
      if (!response.ok) {
        const message = await response.text();
        throw new ExaError(
          message || `Request failed with status code ${response.status}`,
          response.status,
          new Date().toISOString(),
          "/agent/runs"
        );
      }
      return streamAgentEvents(response);
    }

    return this.request<AgentRunTyped<T>>("", "POST", payload);
  }

  /**
   * Get an Agent run by ID.
   */
  async get(runId: string): Promise<AgentRun> {
    return this.request<AgentRun>(`/${runId}`, "GET");
  }

  /**
   * List Agent runs.
   */
  async list(options?: ListAgentRunsParams): Promise<ListAgentRunsResponse> {
    const params = this.buildPaginationParams(options);
    return this.request<ListAgentRunsResponse>("", "GET", undefined, params);
  }

  /**
   * Iterate through all Agent runs, handling pagination automatically.
   */
  async *listAll(options?: ListAgentRunsParams): AsyncGenerator<AgentRun> {
    let cursor: string | undefined = undefined;
    const pageOptions = options ? { ...options } : {};

    while (true) {
      pageOptions.cursor = cursor;
      const response = await this.list(pageOptions);

      for (const run of response.data) {
        yield run;
      }

      if (!response.hasMore || !response.nextCursor) {
        break;
      }

      cursor = response.nextCursor;
    }
  }

  /**
   * Collect all Agent runs into an array.
   */
  async getAll(options?: ListAgentRunsParams): Promise<AgentRun[]> {
    const runs: AgentRun[] = [];
    for await (const run of this.listAll(options)) {
      runs.push(run);
    }
    return runs;
  }

  /**
   * Cancel a queued or running Agent run.
   */
  async cancel(runId: string): Promise<AgentRun> {
    return this.request<AgentRun>(`/${runId}/cancel`, "POST");
  }

  /**
   * Delete a stored Agent run.
   */
  async delete(runId: string): Promise<DeletedAgentRun> {
    return this.request<DeletedAgentRun>(`/${runId}`, "DELETE");
  }

  /**
   * Poll an Agent run until it reaches a terminal status.
   */
  async pollUntilFinished(
    runId: string,
    options?: {
      pollInterval?: number;
      timeoutMs?: number;
    }
  ): Promise<AgentRun & { status: "completed" | "failed" | "cancelled" }> {
    const pollInterval = options?.pollInterval ?? 1000;
    const timeoutMs = options?.timeoutMs ?? 60 * 60 * 1000;
    const startTime = Date.now();

    while (true) {
      const run = await this.get(runId);
      if (
        run.status === "completed" ||
        run.status === "failed" ||
        run.status === "cancelled"
      ) {
        return run as AgentRun & {
          status: "completed" | "failed" | "cancelled";
        };
      }

      if (Date.now() - startTime > timeoutMs) {
        throw new Error(
          `Polling timeout: Agent run ${runId} did not complete within ${timeoutMs}ms`
        );
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }
  }
}

export class AgentClient {
  /**
   * @internal
   */
  readonly client: Exa;

  /**
   * Client for Agent runs.
   */
  runs: AgentRunsClient;

  constructor(client: Exa) {
    this.client = client;
    this.runs = new AgentRunsClient(client);
  }
}

export class AgentBetaRunEventsClient extends AgentRunEventsClient {
  /**
   * List stored events for an Agent run.
   *
   * @deprecated Use exa.agent.runs.events instead.
   */
  async list(
    runId: string,
    options?: WithBetaOptions<ListAgentRunEventsParams>
  ): Promise<ListAgentRunEventsResponse> {
    const { betas, ...pagination } = options ?? {};
    const params = this.buildPaginationParams(pagination);
    return this.request<ListAgentRunEventsResponse>(
      `/${runId}/events`,
      "GET",
      undefined,
      params,
      headersForBetas(betas)
    );
  }
}

export class AgentBetaRunsClient extends AgentRunsClient {
  /**
   * @deprecated Use exa.agent.runs.events instead.
   */
  events: AgentBetaRunEventsClient;

  constructor(client: Exa) {
    super(client);
    this.events = new AgentBetaRunEventsClient(client);
  }

  async create<T>(
    params: WithBetaOptions<AgentCreateOptions<T>> & { stream: true }
  ): Promise<AsyncGenerator<AgentEvent>>;
  async create<T>(
    params: WithBetaOptions<AgentCreateOptions<T>> & { stream?: false }
  ): Promise<AgentRunTyped<T>>;
  async create(
    params: CreateAgentRunParams & AgentBetaOptions
  ): Promise<AgentRun>;
  async create<T>(
    params: WithBetaOptions<AgentCreateOptions<T>>
  ): Promise<AgentRun | AgentRunTyped<T> | AsyncGenerator<AgentEvent>> {
    const { betas, ...createParams } = params;
    const { stream, payload } = buildAgentRunPayload(
      createParams as AgentCreateOptions<T>
    );
    const headers = headersForBetas(betas);

    if (stream) {
      const response = await this.rawRequest("", "POST", payload, undefined, {
        ...headers,
        Accept: "text/event-stream",
      });
      if (!response.ok) {
        const message = await response.text();
        throw new ExaError(
          message || `Request failed with status code ${response.status}`,
          response.status,
          new Date().toISOString(),
          "/agent/runs"
        );
      }
      return streamAgentEvents(response);
    }

    return this.request<AgentRunTyped<T>>(
      "",
      "POST",
      payload,
      undefined,
      headers
    );
  }

  async get(runId: string, options?: AgentBetaOptions): Promise<AgentRun> {
    return this.request<AgentRun>(
      `/${runId}`,
      "GET",
      undefined,
      undefined,
      headersForBetas(options?.betas)
    );
  }

  async list(
    options?: WithBetaOptions<ListAgentRunsParams>
  ): Promise<ListAgentRunsResponse> {
    const { betas, ...pagination } = options ?? {};
    const params = this.buildPaginationParams(pagination);
    return this.request<ListAgentRunsResponse>(
      "",
      "GET",
      undefined,
      params,
      headersForBetas(betas)
    );
  }

  async *listAll(
    options?: WithBetaOptions<ListAgentRunsParams>
  ): AsyncGenerator<AgentRun> {
    let cursor: string | undefined = undefined;
    const { betas, ...pagination } = options ?? {};
    const pageOptions: ListAgentRunsParams = { ...pagination };

    while (true) {
      pageOptions.cursor = cursor;
      const response = await this.list({ ...pageOptions, betas });

      for (const run of response.data) {
        yield run;
      }

      if (!response.hasMore || !response.nextCursor) {
        break;
      }

      cursor = response.nextCursor;
    }
  }

  async getAll(
    options?: WithBetaOptions<ListAgentRunsParams>
  ): Promise<AgentRun[]> {
    const runs: AgentRun[] = [];
    for await (const run of this.listAll(options)) {
      runs.push(run);
    }
    return runs;
  }

  async cancel(runId: string, options?: AgentBetaOptions): Promise<AgentRun> {
    return this.request<AgentRun>(
      `/${runId}/cancel`,
      "POST",
      undefined,
      undefined,
      headersForBetas(options?.betas)
    );
  }

  async delete(
    runId: string,
    options?: AgentBetaOptions
  ): Promise<DeletedAgentRun> {
    return this.request<DeletedAgentRun>(
      `/${runId}`,
      "DELETE",
      undefined,
      undefined,
      headersForBetas(options?.betas)
    );
  }

  async pollUntilFinished(
    runId: string,
    options?: WithBetaOptions<{
      pollInterval?: number;
      timeoutMs?: number;
    }>
  ): Promise<AgentRun & { status: "completed" | "failed" | "cancelled" }> {
    const pollInterval = options?.pollInterval ?? 1000;
    const timeoutMs = options?.timeoutMs ?? 60 * 60 * 1000;
    const startTime = Date.now();
    const headers = headersForBetas(options?.betas);

    while (true) {
      const run = await this.request<AgentRun>(
        `/${runId}`,
        "GET",
        undefined,
        undefined,
        headers
      );
      if (
        run.status === "completed" ||
        run.status === "failed" ||
        run.status === "cancelled"
      ) {
        return run as AgentRun & {
          status: "completed" | "failed" | "cancelled";
        };
      }

      if (Date.now() - startTime > timeoutMs) {
        throw new Error(
          `Polling timeout: Agent run ${runId} did not complete within ${timeoutMs}ms`
        );
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }
  }
}

/**
 * @deprecated Use AgentClient instead.
 */
export class AgentBetaClient extends AgentClient {
  /**
   * @deprecated Use exa.agent.runs instead.
   */
  runs: AgentBetaRunsClient;

  constructor(clientOrAgent: Exa | AgentClient) {
    const client =
      clientOrAgent instanceof AgentClient
        ? clientOrAgent.client
        : clientOrAgent;
    super(client);
    this.runs = new AgentBetaRunsClient(client);
  }
}

export class BetaClient {
  /**
   * @deprecated Use exa.agent instead.
   */
  agent: AgentBetaClient;

  constructor(clientOrAgent: Exa | AgentClient) {
    this.agent = new AgentBetaClient(clientOrAgent);
  }
}
