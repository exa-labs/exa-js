import {
  Exa,
  ListResearchTasksRequest,
  ListResearchTasksResponse,
  ResearchTaskEvent,
  ResearchTask,
} from "../index";
import {
  JSONSchema,
  ResearchCreateTaskRequest,
  ResearchCreateTaskResponse,
  ResearchTaskModel,
} from "../index";
import { ResearchBaseClient } from "./base";

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
    model?: "exa-research" | "exa-research-pro" | ResearchTaskModel;
    output?: { inferSchema?: boolean; schema?: JSONSchema };
  }): Promise<ResearchCreateTaskResponse> {
    // Ensure we have a model (default to exa_research)
    const { instructions, model, output } = params;
    const payload: ResearchCreateTaskRequest = {
      instructions,
      model: (model as ResearchTaskModel) ?? ResearchTaskModel.exa_research,
      output: output
        ? {
            schema: output.schema,
            inferSchema: output.inferSchema ?? true,
          }
        : { inferSchema: true },
    };

    return this.request<ResearchCreateTaskResponse>("/tasks", "POST", payload);
  }

  /**
   * Retrieve a research task by ID.
   *
   * Overloads:
   *   - getTask(id)
   *   - getTask(id, {stream: false})
   *     => Promise<ResearchTask>
   *   - getTask(id, {stream: true})
   *     => AsyncGenerator<ResearchTaskEvent>
   */
  getTask(id: string): Promise<ResearchTask>;
  getTask(id: string, options: { stream?: false }): Promise<ResearchTask>;
  getTask(
    id: string,
    options: { stream: true }
  ): Promise<AsyncGenerator<ResearchTaskEvent, any, any>>;
  getTask(
    id: string,
    options?: { stream?: boolean }
  ): Promise<ResearchTask> | Promise<AsyncGenerator<ResearchTaskEvent>> {
    if (options?.stream) {
      const promise = async () => {
        const resp = await this.rawRequest(`/tasks/${id}?stream=true`, "GET");
        if (!resp.body) {
          throw new Error("No response body for SSE stream");
        }
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        function processPart(part: string): ResearchTaskEvent | null {
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
        | Promise<ResearchTask>
        | Promise<AsyncGenerator<ResearchTaskEvent>>;
    } else {
      // Non-streaming: just fetch the task as before
      return this.request<ResearchTask>(`/tasks/${id}`, "GET") as
        | Promise<ResearchTask>
        | Promise<AsyncGenerator<ResearchTaskEvent>>;
    }
  }

  /**
   * @deprecated This method is deprecated and may be removed in a future release.
   * @see getTask(id, {stream: true})
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
    options?: ListResearchTasksRequest
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
