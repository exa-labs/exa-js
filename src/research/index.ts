export { ResearchClient } from "./client";

// Re-export common enums and types from the generated OpenAPI spec
export {
  ResearchCreateOpenAIResponseDtoModel as ResearchModel,
  ResearchTaskDtoStatus as ResearchStatus,
} from "./openapi";

export type {
  SchemaResearchTaskDto as ResearchTask,
  SchemaListResearchTasksRequestDto as ListResearchTasksRequest,
  SchemaListResearchTasksResponseDto as ListResearchTasksResponse,
  ResearchTaskEventDtoType as ResearchEvent,
  SchemaResearchCreateTaskResponseDto as ResearchCreateTaskResponse,
  SchemaResearchCreateTaskRequestDto as ResearchCreateTaskRequest,
} from "./openapi";
