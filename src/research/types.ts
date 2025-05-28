import type { SearchResult } from "../index";

/**
 * Enum representing the status of a research task.
 */
export enum ResearchStatus {
  /** The research task is still in progress. */
  in_progress = "in_progress",
  /** The research request has finished successfully. */
  completed = "completed",
  /** The research task request failed. */
  failed = "failed",
}

/**
 * Response object returned from the research API.
 */
export type ResearchTask = {
  /** Unique identifier for the task. */
  id: string;
  /** Current status. */
  status: ResearchStatus;
  /** The original instructions provided along with the task. */
  instructions: string;
  /** The original schema defining the task */
  schema: Record<string, any>;
  /** Structured output that follows the user-provided schema (null while running or if failed). */
  data: Record<string, any> | null;
  /**
   * Citations collected while deriving each top-level field in `output`.
   * The key is the field name, the value is the list of `SearchResult`s that
   * were used to compute that field.
   */
  citations: Record<string, SearchResult<{}>[]>;
};
