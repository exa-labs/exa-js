import { Exa } from "../index";
import type { JSONSchema, ResearchTask } from "../index";
import { ResearchBaseClient } from "./base";

/**
 * Client for interacting with the Research Tasks API.
 */
export class ResearchClient extends ResearchBaseClient {
  constructor(client: Exa) {
    super(client);
  }

  /**
   * Create a research task.
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
  ): Promise<{ id: string }> {
    return this.request<{ id: string }>("/tasks", "POST", {
      input,
      output,
    });
  }

  /**
   * Retrieve a research task by ID.
   */
  async getTask(id: string): Promise<ResearchTask> {
    return this.request<ResearchTask>(`/tasks/${id}`, "GET");
  }

  /**
   * Poll a research task until completion or failure.
   * Polls every 1 second with a maximum timeout of 10 minutes.
   */
  async pollTask(id: string): Promise<ResearchTask> {
    const pollingInterval = 1000; // 1 second
    const maxPollingTime = 10 * 60 * 1000; // 10 minutes
    const startTime = Date.now();

    while (true) {
      const task = await this.request<ResearchTask>(`/tasks/${id}`, "GET");

      if (task.status === "completed" || task.status === "failed") {
        return task;
      }

      // Check if we've exceeded the maximum polling time
      if (Date.now() - startTime > maxPollingTime) {
        throw new Error(
          `Polling timeout: Task ${id} did not complete within 10 minutes`
        );
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, pollingInterval));
    }
  }
}
