import { Exa } from "../index";
import {
  ListResearchRequest,
  ListResearchResponse,
  Research,
  ResearchCreateRequest,
  ResearchCreateResponse,
  ResearchStreamEvent,
  ResearchCreateParamsTyped,
  ResearchTyped,
} from "./index";
import type { ZodSchema } from "zod";
import { isZodSchema, zodToJsonSchema } from "../zod-utils";
import { ResearchBaseClient } from "./base";

export class ResearchClient extends ResearchBaseClient {
  constructor(client: Exa) {
    super(client);
  }

  async create<T>(
    params: ResearchCreateParamsTyped<ZodSchema<T>>
  ): Promise<ResearchCreateResponse>;

  async create(params: {
    instructions: string;
    model?: ResearchCreateRequest["model"];
    outputSchema?: Record<string, unknown>;
  }): Promise<ResearchCreateResponse>;

  async create<T>(params: {
    instructions: string;
    model?: ResearchCreateRequest["model"];
    outputSchema?: Record<string, unknown> | ZodSchema<T>;
  }): Promise<ResearchCreateResponse> {
    const { instructions, model, outputSchema } = params;

    let schema = outputSchema;
    if (schema && isZodSchema(schema)) {
      schema = zodToJsonSchema(schema);
    }

    const payload: ResearchCreateRequest = {
      instructions,
      model: model ?? "exa-research-fast",
    };

    if (schema) {
      payload.outputSchema = schema as Record<string, unknown>;
    }

    return this.request<ResearchCreateResponse>("", "POST", payload);
  }

  get(researchId: string): Promise<Research>;
  get(
    researchId: string,
    options: { stream?: false; events?: boolean }
  ): Promise<Research>;
  get<T>(
    researchId: string,
    options: { stream?: false; events?: boolean; outputSchema: ZodSchema<T> }
  ): Promise<ResearchTyped<T>>;
  get(
    researchId: string,
    options: { stream: true; events?: boolean }
  ): Promise<AsyncGenerator<ResearchStreamEvent, any, any>>;
  get<T>(
    researchId: string,
    options: { stream: true; events?: boolean; outputSchema?: ZodSchema<T> }
  ): Promise<AsyncGenerator<ResearchStreamEvent, any, any>>;
  get<T = unknown>(
    researchId: string,
    options?: {
      stream?: boolean;
      events?: boolean;
      outputSchema?: ZodSchema<T>;
    }
  ):
    | Promise<Research | ResearchTyped<T>>
    | Promise<AsyncGenerator<ResearchStreamEvent>> {
    if (options?.stream) {
      const promise = async () => {
        const params: Record<string, string> = { stream: "true" };
        if (options.events !== undefined) {
          params.events = options.events.toString();
        }
        const resp = await this.rawRequest(
          `/${researchId}`,
          "GET",
          undefined,
          params
        );
        if (!resp.body) {
          throw new Error("No response body for SSE stream");
        }
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        function processPart(part: string): ResearchStreamEvent | null {
          const lines = part.split("\n");
          let data = lines.slice(1).join("\n");
          if (data.startsWith("data:")) {
            data = data.slice(5).trimStart();
          }
          try {
            return JSON.parse(data);
          } catch (e) {
            return null;
          }
        }

        async function* streamEvents() {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            let parts = buffer.split("\n\n");
            buffer = parts.pop() ?? "";

            for (const part of parts) {
              const processed = processPart(part);
              if (processed) {
                yield processed;
              }
            }
          }
          if (buffer.trim()) {
            const processed = processPart(buffer.trim());
            if (processed) {
              yield processed;
            }
          }
        }

        return streamEvents();
      };
      return promise() as
        | Promise<Research>
        | Promise<AsyncGenerator<ResearchStreamEvent>>;
    } else {
      const params: Record<string, string> = { stream: "false" };
      if (options?.events !== undefined) {
        params.events = options.events.toString();
      }
      return this.request<Research>(
        `/${researchId}`,
        "GET",
        undefined,
        params
      ) as Promise<Research> | Promise<AsyncGenerator<ResearchStreamEvent>>;
    }
  }

  async list(options?: ListResearchRequest): Promise<ListResearchResponse> {
    const params = this.buildPaginationParams(options);
    return this.request<ListResearchResponse>("", "GET", undefined, params);
  }

  async pollUntilFinished(
    researchId: string,
    options?: {
      pollInterval?: number;
      timeoutMs?: number;
      events?: boolean;
    }
  ): Promise<Research & { status: "completed" | "failed" | "canceled" }>;
  async pollUntilFinished<T>(
    researchId: string,
    options?: {
      pollInterval?: number;
      timeoutMs?: number;
      events?: boolean;
      outputSchema: ZodSchema<T>;
    }
  ): Promise<
    ResearchTyped<T> & { status: "completed" | "failed" | "canceled" }
  >;
  async pollUntilFinished<T = unknown>(
    researchId: string,
    options?: {
      pollInterval?: number;
      timeoutMs?: number;
      events?: boolean;
      outputSchema?: ZodSchema<T>;
    }
  ): Promise<any> {
    const pollInterval = options?.pollInterval ?? 1000;
    const timeoutMs = options?.timeoutMs ?? 10 * 60 * 1000;
    const maxConsecutiveFailures = 5;
    const startTime = Date.now();
    let consecutiveFailures = 0;

    while (true) {
      try {
        const research = await this.get(researchId, {
          events: options?.events,
        });
        consecutiveFailures = 0;

        if (
          research.status === "completed" ||
          research.status === "failed" ||
          research.status === "canceled"
        ) {
          return research;
        }
      } catch (err) {
        consecutiveFailures += 1;
        if (consecutiveFailures >= maxConsecutiveFailures) {
          throw new Error(
            `Polling failed ${maxConsecutiveFailures} times in a row for research ${researchId}: ${err}`
          );
        }
      }

      if (Date.now() - startTime > timeoutMs) {
        throw new Error(
          `Polling timeout: Research ${researchId} did not complete within ${timeoutMs}ms`
        );
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }
  }
}
