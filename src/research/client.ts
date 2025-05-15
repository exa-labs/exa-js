import { Exa, JSONSchema, ResearchTaskResponse } from "../index";
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
   * Mirrors the legacy `exa.researchTask` helper.
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
    throw new Error(
      "getTask is not implemented yet. Follow along at https://github.com/exa-ai/exa/issues/XYZ"
    );
  }
}
