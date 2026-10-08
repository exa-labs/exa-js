/**
 * Client settings the integration tests read from the environment.
 *
 * The suite runs against the hosted API when `EXA_API_KEY` is set and skips
 * otherwise. `EXA_BASE_URL` points the client at another server.
 */
import { describe } from "vitest";
import Exa from "../../src";

export const apiKey = process.env.EXA_API_KEY;

/** `describe` when an API key is configured, `describe.skip` otherwise. */
export const integrationDescribe = apiKey ? describe : describe.skip;

/** A client for the configured API, honouring `EXA_BASE_URL` when it is set. */
export function createClient(): Exa {
  return new Exa(apiKey ?? "test-key", process.env.EXA_BASE_URL || undefined);
}
