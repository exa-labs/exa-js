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
import { ZodSchema } from "zod";
import { isZodSchema, zodToJsonSchema } from "../zod-utils";
import { ResearchBaseClient } from "./base";

/**
 * Client for interacting with the Exa Research API.
 * The Research API allows you to create autonomous research tasks that gather
 * information and return structured JSON objects conforming to a provided schema.
 *
 * @example
 * ```typescript
 * const exa = new Exa(process.env.EXA_API_KEY);
 *
 * // Create a research task
 * const { id } = await exa.research.create({
 *   instructions: "Find the top 5 AI companies by funding in 2024",
 *   outputSchema: mySchema
 * });
 *
 * // Poll until finished
 * const result = await exa.research.pollUntilFinished(id);
 * ```
 */
export class ResearchClient extends ResearchBaseClient {
  constructor(client: Exa) {
    super(client);
  }

  /**
   * Create a new research task with a Zod schema for type-safe output.
   *
   * @template T - The type of the output, inferred from the Zod schema
   * @param params - The research task parameters
   * @param params.instructions - Instructions describing what to research
   * @param params.model - The model to use (default: "exa-research-fast")
   * @param params.outputSchema - A Zod schema defining the expected output structure
   * @returns A promise resolving to the created research task response with an ID
   * @throws {ExaError} If the API request fails
   *
   * @example
   * ```typescript
   * import { z } from "zod";
   *
   * const schema = z.object({
   *   companies: z.array(z.object({
   *     name: z.string(),
   *     funding: z.number()
   *   }))
   * });
   *
   * const response = await exa.research.create({
   *   instructions: "Find top AI startups",
   *   outputSchema: schema
   * });
   * ```
   */
  async create<T>(
    params: ResearchCreateParamsTyped<ZodSchema<T>>
  ): Promise<ResearchCreateResponse>;

  /**
   * Create a new research task with a JSON schema.
   *
   * @param params - The research task parameters
   * @param params.instructions - Instructions describing what to research
   * @param params.model - The model to use (default: "exa-research-fast")
   * @param params.outputSchema - A JSON schema defining the expected output structure
   * @returns A promise resolving to the created research task response with an ID
   * @throws {ExaError} If the API request fails
   */
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

  /**
   * Get a research task by ID.
   *
   * @param researchId - The ID of the research task to retrieve
   * @returns A promise resolving to the research task
   * @throws {ExaError} If the research task is not found or the request fails
   */
  get(researchId: string): Promise<Research>;

  /**
   * Get a research task by ID with options.
   *
   * @param researchId - The ID of the research task to retrieve
   * @param options - Options for the request
   * @param options.stream - If false, returns the complete research object
   * @param options.events - If true, includes detailed events in the response
   * @returns A promise resolving to the research task
   * @throws {ExaError} If the research task is not found or the request fails
   */
  get(
    researchId: string,
    options: { stream?: false; events?: boolean }
  ): Promise<Research>;

  /**
   * Get a research task by ID with typed output using Zod schema.
   *
   * @template T - The type of the parsed output, inferred from the Zod schema
   * @param researchId - The ID of the research task to retrieve
   * @param options - Options for the request
   * @param options.stream - If false, returns the complete research object
   * @param options.events - If true, includes detailed events in the response
   * @param options.outputSchema - Zod schema for parsing the output
   * @returns A promise resolving to the research task with typed parsed output
   * @throws {ExaError} If the research task is not found or the request fails
   */
  get<T>(
    researchId: string,
    options: { stream?: false; events?: boolean; outputSchema: ZodSchema<T> }
  ): Promise<ResearchTyped<T>>;

  /**
   * Get a research task as a stream of events.
   *
   * @param researchId - The ID of the research task to retrieve
   * @param options - Options for the request
   * @param options.stream - If true, returns an async generator of events
   * @param options.events - If true, includes detailed events in the stream
   * @returns A promise resolving to an async generator of research events
   * @throws {ExaError} If the research task is not found or the request fails
   *
   * @example
   * ```typescript
   * const stream = await exa.research.get(researchId, { stream: true });
   * for await (const event of stream) {
   *   console.log(event.eventType, event);
   * }
   * ```
   */
  get(
    researchId: string,
    options: { stream: true; events?: boolean }
  ): Promise<AsyncGenerator<ResearchStreamEvent, any, any>>;

  /**
   * Get a research task as a stream of events with typed output.
   *
   * @template T - The type of the parsed output
   * @param researchId - The ID of the research task to retrieve
   * @param options - Options for the request
   * @param options.stream - If true, returns an async generator of events
   * @param options.events - If true, includes detailed events in the stream
   * @param options.outputSchema - Optional Zod schema for typing the output
   * @returns A promise resolving to an async generator of research events
   * @throws {ExaError} If the research task is not found or the request fails
   */
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

  /**
   * List all research tasks with optional pagination.
   *
   * @param options - Optional pagination parameters
   * @param options.cursor - Cursor for pagination (from previous response)
   * @param options.limit - Maximum number of results to return
   * @returns A promise resolving to a paginated list of research tasks
   * @throws {ExaError} If the API request fails
   *
   * @example
   * ```typescript
   * // Get first page
   * const page1 = await exa.research.list({ limit: 10 });
   *
   * // Get next page
   * if (page1.hasMore) {
   *   const page2 = await exa.research.list({
   *     cursor: page1.nextCursor,
   *     limit: 10
   *   });
   * }
   * ```
   */
  async list(options?: ListResearchRequest): Promise<ListResearchResponse> {
    const params = this.buildPaginationParams(options);
    return this.request<ListResearchResponse>("", "GET", undefined, params);
  }

  /**
   * Poll a research task until it completes, fails, or is canceled.
   *
   * @param researchId - The ID of the research task to poll
   * @param options - Polling options
   * @param options.pollInterval - Interval between polls in ms (default: 1000)
   * @param options.timeoutMs - Maximum time to wait in ms (default: 10 minutes)
   * @param options.events - If true, includes detailed events in the response
   * @returns A promise resolving to the completed research task
   * @throws {ExaError} If polling times out or fails repeatedly
   *
   * @example
   * ```typescript
   * const result = await exa.research.pollUntilFinished(researchId, {
   *   pollInterval: 2000, // Check every 2 seconds
   *   timeoutMs: 5 * 60 * 1000 // Timeout after 5 minutes
   * });
   *
   * if (result.status === "completed") {
   *   console.log(result.output);
   * }
   * ```
   */
  async pollUntilFinished(
    researchId: string,
    options?: {
      pollInterval?: number;
      timeoutMs?: number;
      events?: boolean;
    }
  ): Promise<Research & { status: "completed" | "failed" | "canceled" }>;

  /**
   * Poll a research task until it completes with typed output using Zod schema.
   *
   * @template T - The type of the parsed output, inferred from the Zod schema
   * @param researchId - The ID of the research task to poll
   * @param options - Polling options
   * @param options.pollInterval - Interval between polls in ms (default: 1000)
   * @param options.timeoutMs - Maximum time to wait in ms (default: 10 minutes)
   * @param options.events - If true, includes detailed events in the response
   * @param options.outputSchema - Zod schema for parsing the output
   * @returns A promise resolving to the completed research task with typed output
   * @throws {ExaError} If polling times out or fails repeatedly
   */
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
