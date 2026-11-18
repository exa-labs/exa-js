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
import { type ZodSchema } from "../zod-utils";
import { ResearchBaseClient, researchRetiredError } from "./base";
import { type RequestOptions } from "../request-options";

/**
 * Client for the Research API, which has been retired.
 *
 * Every method rejects with an `ExaError` (`statusCode` 410) without sending a
 * request. Use the Agent API (`exa.agent.runs.create`) for asynchronous,
 * multi-step research.
 */
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
    _params: {
      instructions: string;
      model?: ResearchCreateRequest["model"];
      outputSchema?: Record<string, unknown> | ZodSchema<T>;
    },
    _requestOptions?: RequestOptions
  ): Promise<ResearchCreateResponse> {
    throw researchRetiredError();
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
    _researchId: string,
    _options?: {
      stream?: boolean;
      events?: boolean;
      outputSchema?: ZodSchema<T>;
    },
    _requestOptions?: RequestOptions
  ):
    | Promise<Research | ResearchTyped<T>>
    | Promise<AsyncGenerator<ResearchStreamEvent>> {
    return Promise.reject<Research>(researchRetiredError());
  }

  async list(
    _options?: ListResearchRequest,
    _requestOptions?: RequestOptions
  ): Promise<ListResearchResponse> {
    throw researchRetiredError();
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
    _researchId: string,
    _options?: {
      pollInterval?: number;
      timeoutMs?: number;
      events?: boolean;
      outputSchema?: ZodSchema<T>;
    },
    _requestOptions?: RequestOptions
  ): Promise<any> {
    throw researchRetiredError();
  }
}
