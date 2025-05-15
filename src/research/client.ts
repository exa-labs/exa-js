import { Exa } from "../index";
import type { JSONSchema } from "../index";
import type { ResearchTaskResponse } from "./types";
import { ResearchBaseClient } from "./base";

/**
 * Client for interacting with the Research Tasks API.
 */
export class ResearchClient extends ResearchBaseClient {
  constructor(client: Exa) {
    super(client);
  }

  /**
   * Create and run a research task (blocking call).
   *
   * Both parameters are required and have fixed shapes:
   * 1. `input`
   *      `{ instructions: string }`
   *     • `instructions` – High-level guidance that tells the research agent what to do.
   * 2. `output`
   *    defines the exact structure you expect back, and guides the research conducted by the agent.
   *      `{ schema: JSONSchema }`.
   *    The agent's response will be validated against this schema.
   *
   * @param input  Object containing high-level research instructions.
   * @param output Object containing the expected output schema.
   * @returns The ResearchTaskResponse returned by the API.
   */
  async createTask(
    input: { instructions: string },
    output: { schema: JSONSchema }
  ): Promise<ResearchTaskResponse> {
    return this.request<ResearchTaskResponse>("/tasks", "POST", {
      input,
      output,
    });
  }

  /**
   * Retrieve a research task by ID.
   *
   * Not yet implemented server-side. Calling this will throw until the API is
   * available.
   */
  async getTask(/* id: string */): Promise<ResearchTaskResponse> {
    throw new Error("getTask is not implemented yet.");
  }
}
