import { Exa } from "../index";
import type { JSONSchema } from "../index";
import { ResearchBaseClient } from "./base";
import type { ListResearchTasksOptions } from "./types";
import {
  ResearchCreateTaskRequestDtoModel as ResearchModel,
  SchemaResearchTaskDto as ResearchTask,
  SchemaListResearchTasksResponseDto as ListResearchTasksResponse,
  SchemaResearchCreateTaskRequestDto,
  SchemaResearchCreateTaskResponseDto,
} from "./openapi";

/**
 * Client for interacting with the Research Tasks API.
 */
export class ResearchClient extends ResearchBaseClient {
  constructor(client: Exa) {
    super(client);
  }

  /**
   * Create a new research task.
   *
   * @param params Object containing:
   *   - model: The research model to use (e.g., ResearchModel.ExaResearch).
   *   - instructions: High-level guidance for the research agent.
   *   - output: An object with a `schema` property (JSONSchema) that defines the expected output structure.
   *
   * @returns An object containing the unique ID of the created research task.
   */
  async createTask(params: {
    instructions: string;
    model?: ResearchModel;
    output?: { inferSchema?: boolean; schema?: JSONSchema };
  }): Promise<SchemaResearchCreateTaskResponseDto> {
    // Ensure we have a model (default to exa_research)
    const { instructions, model, output } = params;
    const payload: SchemaResearchCreateTaskRequestDto = {
      instructions,
      model: model ?? ResearchModel.exa_research,
      output: output
        ? {
            schema: output.schema,
            inferSchema: output.inferSchema ?? true,
          }
        : { inferSchema: true },
    };

    return this.request<SchemaResearchCreateTaskResponseDto>(
      "/tasks",
      "POST",
      payload
    );
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
   * Resilient to up to 10 consecutive polling failures.
   */
  async pollTask(id: string): Promise<ResearchTask> {
    const pollingInterval = 1000; // 1 second
    const maxPollingTime = 10 * 60 * 1000; // 10 minutes
    const maxConsecutiveFailures = 10;
    const startTime = Date.now();
    let consecutiveFailures = 0;

    while (true) {
      try {
        const task = await this.request<ResearchTask>(`/tasks/${id}`, "GET");
        consecutiveFailures = 0; // Reset on success

        if (task.status === "completed" || task.status === "failed") {
          return task;
        }
      } catch (err) {
        consecutiveFailures += 1;
        if (consecutiveFailures >= maxConsecutiveFailures) {
          throw new Error(
            `Polling failed ${maxConsecutiveFailures} times in a row for task ${id}: ${err}`
          );
        }
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

  /**
   * List research tasks
   * @param options Pagination options
   * @returns The paginated list of research tasks
   */
  async listTasks(
    options?: ListResearchTasksOptions
  ): Promise<ListResearchTasksResponse> {
    const params = this.buildPaginationParams(options);
    return this.request<ListResearchTasksResponse>(
      "/tasks",
      "GET",
      undefined,
      params
    );
  }
}
