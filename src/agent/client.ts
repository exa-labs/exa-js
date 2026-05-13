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
    options: ListAgentRunEventsParams
  ): Promise<ListAgentRunEventsResponse> {
    const params = this.buildPaginationParams(options);
    return this.request<ListAgentRunEventsResponse>(
      `/${runId}/events`,
      options.betas,
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
    const { stream, outputSchema, betas, ...rest } = params;
    let schema = outputSchema;
    if (schema && isZodSchema(schema)) {
      schema = zodToJsonSchema(schema as ZodSchema<T>);
    }

    const payload: Record<string, unknown> = { ...rest };
    if (schema) {
      payload.outputSchema = schema;
    }

    if (stream) {
      const response = await this.rawRequest(
        "",
        betas,
        "POST",
        payload,
        undefined,
        {
          Accept: "text/event-stream",
        }
      );
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

    return this.request<AgentRunTyped<T>>("", betas, "POST", payload);
  }

  /**
   * Get an Agent run by ID.
   */
  async get(runId: string, options: AgentBetaOptions): Promise<AgentRun> {
    return this.request<AgentRun>(`/${runId}`, options.betas, "GET");
  }

  /**
   * List Agent runs.
   */
  async list(options: ListAgentRunsParams): Promise<ListAgentRunsResponse> {
    const params = this.buildPaginationParams(options);
    return this.request<ListAgentRunsResponse>(
      "",
      options.betas,
      "GET",
      undefined,
      params
    );
  }

  /**
   * Iterate through all Agent runs, handling pagination automatically.
   */
  async *listAll(options: ListAgentRunsParams): AsyncGenerator<AgentRun> {
    let cursor: string | undefined = undefined;
    const pageOptions = { ...options };

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
  async getAll(options: ListAgentRunsParams): Promise<AgentRun[]> {
    const runs: AgentRun[] = [];
    for await (const run of this.listAll(options)) {
      runs.push(run);
    }
    return runs;
  }

  /**
   * Cancel a queued or running Agent run.
   */
  async cancel(runId: string, options: AgentBetaOptions): Promise<AgentRun> {
    return this.request<AgentRun>(`/${runId}/cancel`, options.betas, "POST");
  }

  /**
   * Delete a stored Agent run.
   */
  async delete(
    runId: string,
    options: AgentBetaOptions
  ): Promise<DeletedAgentRun> {
    return this.request<DeletedAgentRun>(`/${runId}`, options.betas, "DELETE");
  }

  /**
   * Poll an Agent run until it reaches a terminal status.
   */
  async pollUntilFinished(
    runId: string,
    options: AgentBetaOptions & {
      pollInterval?: number;
      timeoutMs?: number;
    }
  ): Promise<AgentRun & { status: "completed" | "failed" | "cancelled" }> {
    const pollInterval = options?.pollInterval ?? 1000;
    const timeoutMs = options?.timeoutMs ?? 60 * 60 * 1000;
    const startTime = Date.now();

    while (true) {
      const run = await this.get(runId, { betas: options.betas });
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

export class AgentBetaClient {
  /**
   * Client for Agent runs.
   */
  runs: AgentRunsClient;

  constructor(client: Exa) {
    this.runs = new AgentRunsClient(client);
  }
}

export class BetaClient {
  /**
   * Beta Agent namespace.
   */
  agent: AgentBetaClient;

  constructor(client: Exa) {
    this.agent = new AgentBetaClient(client);
  }
}
