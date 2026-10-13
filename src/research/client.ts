import { Exa } from "../index";
import { ExaAbortError } from "../errors";
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
import { ZodSchema } from "zod";
import { isZodSchema, zodToJsonSchema } from "../zod-utils";
import { ResearchBaseClient } from "./base";
import { sleep, type RequestOptions } from "../request-options";

export class ResearchClient extends ResearchBaseClient {
  constructor(client: Exa) {
    super(client);
  }

  async create<T>(
    params: ResearchCreateParamsTyped<ZodSchema<T>>,
    requestOptions?: RequestOptions
  ): Promise<ResearchCreateResponse>;

  async create(
    params: {
      instructions: string;
      model?: ResearchCreateRequest["model"];
      outputSchema?: Record<string, unknown>;
    },
    requestOptions?: RequestOptions
  ): Promise<ResearchCreateResponse>;

  async create<T>(
    params: {
      instructions: string;
      model?: ResearchCreateRequest["model"];
      outputSchema?: Record<string, unknown> | ZodSchema<T>;
    },
    requestOptions?: RequestOptions
  ): Promise<ResearchCreateResponse> {
    const scoped = this.withRequestOptions(requestOptions);
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

    return scoped.request<ResearchCreateResponse>("", "POST", payload);
  }

  get(
    researchId: string,
    options?: undefined,
    requestOptions?: RequestOptions
  ): Promise<Research>;
  get(
    researchId: string,
    options: { stream?: false; events?: boolean },
    requestOptions?: RequestOptions
  ): Promise<Research>;
  get<T>(
    researchId: string,
    options: { stream?: false; events?: boolean; outputSchema: ZodSchema<T> },
    requestOptions?: RequestOptions
  ): Promise<ResearchTyped<T>>;
  get(
    researchId: string,
    options: { stream: true; events?: boolean },
    requestOptions?: RequestOptions
  ): Promise<AsyncGenerator<ResearchStreamEvent, any, any>>;
  get<T>(
    researchId: string,
    options: { stream: true; events?: boolean; outputSchema?: ZodSchema<T> },
    requestOptions?: RequestOptions
  ): Promise<AsyncGenerator<ResearchStreamEvent, any, any>>;
  get<T = unknown>(
    researchId: string,
    options?: {
      stream?: boolean;
      events?: boolean;
      outputSchema?: ZodSchema<T>;
    },
    requestOptions?: RequestOptions
  ):
    | Promise<Research | ResearchTyped<T>>
    | Promise<AsyncGenerator<ResearchStreamEvent>> {
    const scoped = this.withRequestOptions(requestOptions);
    if (options?.stream) {
      const promise = async () => {
        const params: Record<string, string> = { stream: "true" };
        if (options.events !== undefined) {
          params.events = options.events.toString();
        }
        const resp = await scoped.rawRequest(
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
          try {
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
          } finally {
            // Cancel so the request's signal listeners are released even if
            // the consumer stops early.
            try {
              await reader.cancel();
            } catch {
              // ignore
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
      return scoped.request<Research>(
        `/${researchId}`,
        "GET",
        undefined,
        params
      ) as Promise<Research> | Promise<AsyncGenerator<ResearchStreamEvent>>;
    }
  }

  async list(
    options?: ListResearchRequest,
    requestOptions?: RequestOptions
  ): Promise<ListResearchResponse> {
    const scoped = this.withRequestOptions(requestOptions);
    const params = this.buildPaginationParams(options);
    return scoped.request<ListResearchResponse>("", "GET", undefined, params);
  }

  async pollUntilFinished(
    researchId: string,
    options?: {
      pollInterval?: number;
      timeoutMs?: number;
      events?: boolean;
    },
    requestOptions?: RequestOptions
  ): Promise<Research & { status: "completed" | "failed" | "canceled" }>;
  async pollUntilFinished<T>(
    researchId: string,
    options?: {
      pollInterval?: number;
      timeoutMs?: number;
      events?: boolean;
      outputSchema: ZodSchema<T>;
    },
    requestOptions?: RequestOptions
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
    },
    requestOptions?: RequestOptions
  ): Promise<any> {
    const scoped = this.withRequestOptions(requestOptions);
    const pollInterval = options?.pollInterval ?? 1000;
    const timeoutMs = options?.timeoutMs ?? 10 * 60 * 1000;
    const maxConsecutiveFailures = 5;
    const startTime = Date.now();
    let consecutiveFailures = 0;

    while (true) {
      try {
        const research = await scoped.get(researchId, {
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
        // A cancelled poll is the caller's decision, not a failed attempt.
        if (err instanceof ExaAbortError) {
          throw err;
        }
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

      await sleep(pollInterval, scoped.requestOptions?.signal);
    }
  }
}
