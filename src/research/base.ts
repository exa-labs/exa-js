import { ExaError } from "../errors";
import { Exa } from "../index";
import { RequestScopedClient } from "../request-options";
import { ListResearchRequest } from "./index";

/** The message every Research API method rejects with. */
export const RESEARCH_RETIRED_MESSAGE =
  "The Exa Research API has been retired and no longer accepts requests. " +
  "Use the Agent API (exa.agent.runs.create) for asynchronous, multi-step research.";

/**
 * The error every Research API method rejects with, before sending a request.
 * Its `statusCode` is 410, the status the API answers Research paths with.
 */
export function researchRetiredError(): ExaError {
  return new ExaError(RESEARCH_RETIRED_MESSAGE, 410);
}

type QueryParams = Record<
  string,
  string | number | boolean | string[] | undefined
>;

interface RequestBody {
  [key: string]: unknown;
}

export class ResearchBaseClient extends RequestScopedClient {
  protected client: Exa;

  constructor(client: Exa) {
    super();
    this.client = client;
  }

  /** Rejects with `researchRetiredError()`: the Research API has been retired. */
  protected async request<T = unknown>(
    _endpoint: string,
    _method: string = "POST",
    _data?: RequestBody,
    _params?: QueryParams
  ): Promise<T> {
    throw researchRetiredError();
  }

  /** Rejects with `researchRetiredError()`: the Research API has been retired. */
  protected async rawRequest(
    _endpoint: string,
    _method: string = "POST",
    _data?: RequestBody,
    _params?: QueryParams
  ): Promise<Response> {
    throw researchRetiredError();
  }

  protected buildPaginationParams(
    pagination?: ListResearchRequest
  ): QueryParams {
    const params: QueryParams = {};
    if (!pagination) return params;

    if (pagination.cursor) params.cursor = pagination.cursor;
    if (pagination.limit) params.limit = pagination.limit;

    return params;
  }
}
