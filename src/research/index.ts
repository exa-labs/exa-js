export { ResearchClient } from "./client";

// Re-export common enums and types from the generated OpenAPI spec
export {
  ResearchCreateTaskRequestDtoModel as ResearchModel,
  ResearchTaskDtoStatus as ResearchStatus,
} from "./openapi";

export type {
  SchemaResearchTaskDto as ResearchTask,
  SchemaListResearchTasksResponseDto as ListResearchTasksResponse,
} from "./openapi";

// Additional helper types
export type { ListResearchTasksOptions } from "./types";
