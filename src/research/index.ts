import { components, SchemaResearchTaskDto } from "./openapi";

export { ResearchClient } from "./client";

export {
  ResearchCreateOpenAIResponseDtoModel as ResearchTaskModel,
  ResearchTaskDtoStatus as ResearchTaskStatus,
  ResearchTaskDtoOperationsType as ResearchTaskOperationType,
  ResearchTaskEventDtoType as ResearchTaskEventType,
} from "./openapi";

export type ResearchTaskEvent = components["schemas"]["ResearchTaskEventDto"];
export type ResearchTaskOperation = SchemaResearchTaskDto["operations"][0];

export type {
  SchemaResearchTaskDto as ResearchTask,
  SchemaListResearchTasksRequestDto as ListResearchTasksRequest,
  SchemaListResearchTasksResponseDto as ListResearchTasksResponse,
  SchemaResearchCreateTaskResponseDto as ResearchCreateTaskResponse,
  SchemaResearchCreateTaskRequestDto as ResearchCreateTaskRequest,
} from "./openapi";
