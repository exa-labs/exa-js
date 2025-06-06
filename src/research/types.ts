// (No external type imports required)

import type { SchemaResearchTaskDto as _ResearchTask } from "./openapi";

export type ResearchTask = _ResearchTask;

export {
  ResearchCreateTaskRequestDtoModel as ResearchModel,
  ResearchTaskDtoStatus as ResearchStatus,
} from "./openapi";

// Add common pagination parameters for list endpoints
export interface PaginationParams {
  /** Cursor for pagination */
  cursor?: string;
  /** Maximum number of items per page */
  limit?: number;
}

/**
 * Response object for listing research tasks.
 */
export interface ListResearchTasksResponse {
  /** The list of research tasks returned by the API */
  data: ResearchTask[];
  /** Whether there are more results to paginate through */
  hasMore: boolean;
  /** The cursor to paginate through the next set of results */
  nextCursor: string | null;
}

/**
 * Options for listing research tasks (API only supports pagination)
 */
export type ListResearchTasksOptions = PaginationParams;
