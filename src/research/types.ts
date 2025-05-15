import type { SearchResult } from "../index";

/**
 * Enum representing the status of a research task.
 */
export enum ResearchStatus {
  /** The research request has finished successfully. */
  completed = "completed",
  /** The research request failed. */
  failed = "failed",
}

/**
 * Response object returned from the research API.
 */
export type ResearchTaskResponse = {
  /** Unique identifier for the task. */
  id: string;
  /** Current status (may include future enum values served by the API). */
  status: ResearchStatus | string;
  /** Structured output that follows the user-provided schema (null while running). */
  output: Record<string, any> | null;
  /** Citations collected during the research process. */
  citations: SearchResult<{}>[];
};
