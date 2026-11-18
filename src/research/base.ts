import { ExaError } from "../errors";
import { Exa } from "../index";
import { RequestScopedClient } from "../request-options";

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

export class ResearchBaseClient extends RequestScopedClient {
  protected client: Exa;

  constructor(client: Exa) {
    super();
    this.client = client;
  }
}
