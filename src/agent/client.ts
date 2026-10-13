/**
 * Client for the Exa Agent API.
 */

import { ZodSchema } from "zod";
import { Exa } from "../index";
import { ExaError } from "../errors";
import { isZodSchema, zodToJsonSchema } from "../zod-utils";
import { AgentBaseClient } from "./base";
import { headersForBetas } from "./betas";
import { AgentMonitorsClient } from "./monitors/client";
import {
  AGENT_MAX_EFFORT_BETA,
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
import { sleep, type RequestOptions } from "../request-options";

type WithBetaOptions<T> = T & AgentBetaOptions;
type AgentTerminalStatus = "completed" | "failed" | "cancelled";
type AgentTerminalRun = AgentRun & { status: AgentTerminalStatus };
type AgentTerminalRunTyped<T> = AgentRunTyped<T> & {
  status: AgentTerminalStatus;
};
type AgentCompletedRun = AgentRun & { status: "completed" };
type AgentCompletedRunTyped<T> = AgentRunTyped<T> & {
  status: "completed";
};
const DEFAULT_AGENT_POLL_INTERVAL_MS = 1000;
const DEFAULT_AGENT_POLL_TIMEOUT_MS = 60 * 60 * 1000;
const DEFAULT_AGENT_CREATE_AND_WAIT_TIMEOUT_MS = 2 * 60 * 1000;
const TERMINAL_AGENT_RUN_STATUSES = new Set<AgentTerminalStatus>([
  "completed",
  "failed",
  "cancelled",
]);
export type AgentWaitOptions = {
  pollInterval?: number;
  timeoutMs?: number;
};

export class AgentRunFailedError extends Error {
  run: AgentRun & { status: "failed" };

  constructor(run: AgentRun & { status: "failed" }) {
    super(run.error?.message ?? `Agent run ${run.id} failed`);
    this.name = "AgentRunFailedError";
    this.run = run;
  }
}

export class AgentRunCancelledError extends Error {
  run: AgentRun & { status: "cancelled" };

  constructor(run: AgentRun & { status: "cancelled" }) {
    super(`Agent run ${run.id} was cancelled`);
    this.name = "AgentRunCancelledError";
    this.run = run;
  }
}

function isTerminalAgentRunStatus(
  status: AgentRun["status"]
): status is AgentTerminalStatus {
  return TERMINAL_AGENT_RUN_STATUSES.has(status as AgentTerminalStatus);
}

function ensureCompletedRun<T>(
  run: AgentTerminalRunTyped<T>
): AgentCompletedRunTyped<T> {
  if (run.status === "failed") {
    throw new AgentRunFailedError(run as AgentRun & { status: "failed" });
  }
  if (run.status === "cancelled") {
    throw new AgentRunCancelledError(run as AgentRun & { status: "cancelled" });
  }
  return run as AgentCompletedRunTyped<T>;
}

function createAndWaitPollOptions(
  options?: AgentWaitOptions
): AgentWaitOptions {
  return {
    pollInterval: options?.pollInterval ?? DEFAULT_AGENT_POLL_INTERVAL_MS,
    timeoutMs: options?.timeoutMs ?? DEFAULT_AGENT_CREATE_AND_WAIT_TIMEOUT_MS,
  };
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
    options?: ListAgentRunEventsParams,
    requestOptions?: RequestOptions
  ): Promise<ListAgentRunEventsResponse> {
    const scoped = this.withRequestOptions(requestOptions);
    const params = this.buildPaginationParams(options);
    return scoped.request<ListAgentRunEventsResponse>(
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
    params: AgentCreateOptions<T> & { stream: true },
    requestOptions?: RequestOptions
  ): Promise<AsyncGenerator<AgentEvent>>;
  async create<T>(
    params: AgentCreateOptions<T> & { stream?: false },
    requestOptions?: RequestOptions
  ): Promise<AgentRunTyped<T>>;
  async create(
    params: CreateAgentRunParams,
    requestOptions?: RequestOptions
  ): Promise<AgentRun>;
  async create<T>(
    params: AgentCreateOptions<T>,
    requestOptions?: RequestOptions
  ): Promise<AgentRun | AgentRunTyped<T> | AsyncGenerator<AgentEvent>> {
    const scoped = this.withRequestOptions(requestOptions);
    const { stream, payload } = buildAgentRunPayload(params);

    if (stream) {
      const response = await scoped.rawRequest("", "POST", payload, undefined, {
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

    return scoped.request<AgentRunTyped<T>>("", "POST", payload);
  }

  /**
   * Get an Agent run by ID.
   */
  async get(runId: string, requestOptions?: RequestOptions): Promise<AgentRun> {
    const scoped = this.withRequestOptions(requestOptions);
    return scoped.request<AgentRun>(`/${runId}`, "GET");
  }

  /**
   * List Agent runs.
   */
  async list(
    options?: ListAgentRunsParams,
    requestOptions?: RequestOptions
  ): Promise<ListAgentRunsResponse> {
    const scoped = this.withRequestOptions(requestOptions);
    const params = this.buildPaginationParams(options);
    return scoped.request<ListAgentRunsResponse>("", "GET", undefined, params);
  }

  /**
   * Iterate through all Agent runs, handling pagination automatically.
   */
  async *listAll(
    options?: ListAgentRunsParams,
    requestOptions?: RequestOptions
  ): AsyncGenerator<AgentRun> {
    let scoped = this.withRequestOptions(requestOptions);
    let cursor: string | undefined = undefined;
    const pageOptions = options ? { ...options } : {};

    while (true) {
      pageOptions.cursor = cursor;
      const response = await scoped.list(pageOptions);

      for (const run of response.data) {
        yield run;
      }

      if (!response.hasMore || !response.nextCursor) {
        break;
      }

      cursor = response.nextCursor;
      scoped = scoped.forNextPage();
    }
  }

  /**
   * Collect all Agent runs into an array.
   */
  async getAll(
    options?: ListAgentRunsParams,
    requestOptions?: RequestOptions
  ): Promise<AgentRun[]> {
    const scoped = this.withRequestOptions(requestOptions);
    const runs: AgentRun[] = [];
    for await (const run of scoped.listAll(options)) {
      runs.push(run);
    }
    return runs;
  }

  /**
   * Cancel a queued or running Agent run.
   */
  async cancel(
    runId: string,
    requestOptions?: RequestOptions
  ): Promise<AgentRun> {
    const scoped = this.withRequestOptions(requestOptions);
    return scoped.request<AgentRun>(`/${runId}/cancel`, "POST");
  }

  /**
   * Stop a running Agent run, completing it early with the results
   * gathered so far. Only supported for `ultra` effort runs.
   */
  async stop(
    runId: string,
    requestOptions?: RequestOptions
  ): Promise<AgentRun> {
    const scoped = this.withRequestOptions(requestOptions);
    return scoped.request<AgentRun>(`/${runId}/stop`, "POST");
  }

  /**
   * Delete a stored Agent run.
   */
  async delete(
    runId: string,
    requestOptions?: RequestOptions
  ): Promise<DeletedAgentRun> {
    const scoped = this.withRequestOptions(requestOptions);
    return scoped.request<DeletedAgentRun>(`/${runId}`, "DELETE");
  }

  /**
   * Poll an Agent run until it reaches a terminal status.
   */
  async pollUntilFinished(
    runId: string,
    options?: AgentWaitOptions,
    requestOptions?: RequestOptions
  ): Promise<AgentTerminalRun> {
    const scoped = this.withRequestOptions(requestOptions);
    const pollInterval =
      options?.pollInterval ?? DEFAULT_AGENT_POLL_INTERVAL_MS;
    const timeoutMs = options?.timeoutMs ?? DEFAULT_AGENT_POLL_TIMEOUT_MS;
    const startTime = Date.now();

    while (true) {
      const run = await scoped.get(runId);
      if (isTerminalAgentRunStatus(run.status)) {
        return run as AgentTerminalRun;
      }

      if (Date.now() - startTime > timeoutMs) {
        throw new Error(
          `Polling timeout: Agent run ${runId} did not complete within ${timeoutMs}ms`
        );
      }

      await sleep(pollInterval, scoped.requestOptions?.signal);
    }
  }

  /**
   * Create an Agent run and wait until it reaches a terminal status.
   */
  async createAndWait<T>(
    params: Omit<AgentCreateOptions<T>, "stream">,
    options?: AgentWaitOptions,
    requestOptions?: RequestOptions
  ): Promise<AgentCompletedRunTyped<T>>;
  async createAndWait(
    params: CreateAgentRunParams,
    options?: AgentWaitOptions,
    requestOptions?: RequestOptions
  ): Promise<AgentCompletedRun>;
  async createAndWait<T>(
    params: Omit<AgentCreateOptions<T>, "stream">,
    options?: AgentWaitOptions,
    requestOptions?: RequestOptions
  ): Promise<AgentCompletedRunTyped<T>> {
    const scoped = this.withRequestOptions(requestOptions);
    const { stream: _stream, ...createParams } =
      params as AgentCreateOptions<T>;
    const run = (await scoped.create(
      createParams as AgentCreateOptions<T> & { stream?: false }
    )) as AgentRunTyped<T>;
    const runId = (run as AgentRun).id;
    const terminalRun = (await scoped.pollUntilFinished(
      runId,
      createAndWaitPollOptions(options)
    )) as AgentTerminalRunTyped<T>;
    return ensureCompletedRun(terminalRun);
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
    options?: WithBetaOptions<ListAgentRunEventsParams>,
    requestOptions?: RequestOptions
  ): Promise<ListAgentRunEventsResponse> {
    const scoped = this.withRequestOptions(requestOptions);
    const { betas, ...pagination } = options ?? {};
    const params = this.buildPaginationParams(pagination);
    return scoped.request<ListAgentRunEventsResponse>(
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
    params: WithBetaOptions<AgentCreateOptions<T>> & { stream: true },
    requestOptions?: RequestOptions
  ): Promise<AsyncGenerator<AgentEvent>>;
  async create<T>(
    params: WithBetaOptions<AgentCreateOptions<T>> & { stream?: false },
    requestOptions?: RequestOptions
  ): Promise<AgentRunTyped<T>>;
  async create(
    params: CreateAgentRunParams & AgentBetaOptions,
    requestOptions?: RequestOptions
  ): Promise<AgentRun>;
  async create<T>(
    params: WithBetaOptions<AgentCreateOptions<T>>,
    requestOptions?: RequestOptions
  ): Promise<AgentRun | AgentRunTyped<T> | AsyncGenerator<AgentEvent>> {
    const scoped = this.withRequestOptions(requestOptions);
    const { betas, ...createParams } = params;
    const { stream, payload } = buildAgentRunPayload(
      createParams as AgentCreateOptions<T>
    );
    const headers = headersForBetas(betas);

    if (stream) {
      const response = await scoped.rawRequest("", "POST", payload, undefined, {
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

    return scoped.request<AgentRunTyped<T>>(
      "",
      "POST",
      payload,
      undefined,
      headers
    );
  }

  async get(
    runId: string,
    options?: AgentBetaOptions & RequestOptions
  ): Promise<AgentRun> {
    const scoped = this.withRequestOptions(options);
    return scoped.request<AgentRun>(
      `/${runId}`,
      "GET",
      undefined,
      undefined,
      headersForBetas(options?.betas)
    );
  }

  async list(
    options?: WithBetaOptions<ListAgentRunsParams>,
    requestOptions?: RequestOptions
  ): Promise<ListAgentRunsResponse> {
    const scoped = this.withRequestOptions(requestOptions);
    const { betas, ...pagination } = options ?? {};
    const params = this.buildPaginationParams(pagination);
    return scoped.request<ListAgentRunsResponse>(
      "",
      "GET",
      undefined,
      params,
      headersForBetas(betas)
    );
  }

  async *listAll(
    options?: WithBetaOptions<ListAgentRunsParams>,
    requestOptions?: RequestOptions
  ): AsyncGenerator<AgentRun> {
    let scoped = this.withRequestOptions(requestOptions);
    let cursor: string | undefined = undefined;
    const { betas, ...pagination } = options ?? {};
    const pageOptions: ListAgentRunsParams = { ...pagination };

    while (true) {
      pageOptions.cursor = cursor;
      const response = await scoped.list({ ...pageOptions, betas });

      for (const run of response.data) {
        yield run;
      }

      if (!response.hasMore || !response.nextCursor) {
        break;
      }

      cursor = response.nextCursor;
      scoped = scoped.forNextPage();
    }
  }

  async getAll(
    options?: WithBetaOptions<ListAgentRunsParams>,
    requestOptions?: RequestOptions
  ): Promise<AgentRun[]> {
    const scoped = this.withRequestOptions(requestOptions);
    const runs: AgentRun[] = [];
    for await (const run of scoped.listAll(options)) {
      runs.push(run);
    }
    return runs;
  }

  async cancel(
    runId: string,
    options?: AgentBetaOptions & RequestOptions
  ): Promise<AgentRun> {
    const scoped = this.withRequestOptions(options);
    return scoped.request<AgentRun>(
      `/${runId}/cancel`,
      "POST",
      undefined,
      undefined,
      headersForBetas(options?.betas)
    );
  }

  /**
   * Stop a running Agent run, completing it early with the results
   * gathered so far. Only supported for `ultra` effort runs.
   */
  async stop(
    runId: string,
    options?: AgentBetaOptions & RequestOptions
  ): Promise<AgentRun> {
    const scoped = this.withRequestOptions(options);
    return scoped.request<AgentRun>(
      `/${runId}/stop`,
      "POST",
      undefined,
      undefined,
      headersForBetas(options?.betas ?? [AGENT_MAX_EFFORT_BETA])
    );
  }

  async delete(
    runId: string,
    options?: AgentBetaOptions & RequestOptions
  ): Promise<DeletedAgentRun> {
    const scoped = this.withRequestOptions(options);
    return scoped.request<DeletedAgentRun>(
      `/${runId}`,
      "DELETE",
      undefined,
      undefined,
      headersForBetas(options?.betas)
    );
  }

  async pollUntilFinished(
    runId: string,
    options?: WithBetaOptions<AgentWaitOptions>,
    requestOptions?: RequestOptions
  ): Promise<AgentTerminalRun> {
    const scoped = this.withRequestOptions(requestOptions);
    const pollInterval =
      options?.pollInterval ?? DEFAULT_AGENT_POLL_INTERVAL_MS;
    const timeoutMs = options?.timeoutMs ?? DEFAULT_AGENT_POLL_TIMEOUT_MS;
    const startTime = Date.now();
    const headers = headersForBetas(options?.betas);

    while (true) {
      const run = await scoped.request<AgentRun>(
        `/${runId}`,
        "GET",
        undefined,
        undefined,
        headers
      );
      if (isTerminalAgentRunStatus(run.status)) {
        return run as AgentTerminalRun;
      }

      if (Date.now() - startTime > timeoutMs) {
        throw new Error(
          `Polling timeout: Agent run ${runId} did not complete within ${timeoutMs}ms`
        );
      }

      await sleep(pollInterval, scoped.requestOptions?.signal);
    }
  }

  async createAndWait<T>(
    params: WithBetaOptions<Omit<AgentCreateOptions<T>, "stream">>,
    options?: AgentWaitOptions,
    requestOptions?: RequestOptions
  ): Promise<AgentCompletedRunTyped<T>>;
  async createAndWait(
    params: CreateAgentRunParams & AgentBetaOptions,
    options?: AgentWaitOptions,
    requestOptions?: RequestOptions
  ): Promise<AgentCompletedRun>;
  async createAndWait<T>(
    params: WithBetaOptions<Omit<AgentCreateOptions<T>, "stream">>,
    options?: AgentWaitOptions,
    requestOptions?: RequestOptions
  ): Promise<AgentCompletedRunTyped<T>> {
    const scoped = this.withRequestOptions(requestOptions);
    const {
      betas,
      stream: _stream,
      ...createParams
    } = params as WithBetaOptions<AgentCreateOptions<T>>;
    const run = (await scoped.create({
      ...createParams,
      betas,
    })) as AgentRunTyped<T>;
    const runId = (run as AgentRun).id;
    const terminalRun = (await scoped.pollUntilFinished(runId, {
      ...createAndWaitPollOptions(options),
      betas,
    })) as AgentTerminalRunTyped<T>;
    return ensureCompletedRun(terminalRun);
  }
}

/** Beta Agent API clients. */
export class AgentBetaClient extends AgentClient {
  /**
   * @deprecated Use exa.agent.runs instead.
   */
  runs: AgentBetaRunsClient;

  /**
   * Beta client for Agent Monitors.
   */
  monitors: AgentMonitorsClient;

  constructor(clientOrAgent: Exa | AgentClient) {
    const client =
      clientOrAgent instanceof AgentClient
        ? clientOrAgent.client
        : clientOrAgent;
    super(client);
    this.runs = new AgentBetaRunsClient(client);
    this.monitors = new AgentMonitorsClient(client);
  }
}

export class BetaClient {
  /**
   * Beta Agent namespace. Stable Agent runs remain available here for
   * backwards compatibility; beta-only Agent products live here exclusively.
   */
  agent: AgentBetaClient;

  constructor(clientOrAgent: Exa | AgentClient) {
    this.agent = new AgentBetaClient(clientOrAgent);
  }
}
