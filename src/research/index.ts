import { components } from "./openapi";

export type Research = components["schemas"]["ResearchDtoClass"];
export type ResearchStatus = Research["status"];
export type ResearchEvent = components["schemas"]["ResearchEventDtoClass"];
export type ResearchOperation =
  components["schemas"]["ResearchOperationDtoClass"];

type DeepReplaceParsed<T, TData> = T extends {
  parsed?: Record<string, unknown>;
}
  ? Omit<T, "parsed"> & { parsed: TData }
  : T extends object
    ? { [K in keyof T]: DeepReplaceParsed<T[K], TData> }
    : T;

export type ResearchTyped<T> = DeepReplaceParsed<Research, T>;

export type ResearchStreamEventTyped<T> = DeepReplaceParsed<
  ResearchStreamEvent,
  T
>;

export type ListResearchRequest = {
  cursor?: string;
  limit?: number;
};

export type ListResearchResponse =
  components["schemas"]["ListResearchResponseDto"];

export type ResearchCreateRequest =
  components["schemas"]["ResearchCreateRequestDtoClass"];

export type ResearchCreateResponse = Research;

export type ResearchStreamEvent = ResearchEvent;

/**
 * Enhanced research creation params with zod schema support
 */
export type ResearchCreateParamsTyped<T> = {
  instructions: string;
  model?: ResearchCreateRequest["model"];
  outputSchema?: T;
};

type ResearchDefinitionEvent = Extract<
  ResearchEvent,
  { eventType: "research-definition" }
>;
type ResearchOutputEvent = Extract<
  ResearchEvent,
  { eventType: "research-output" }
>;
type ResearchPlanDefinitionEvent = Extract<
  ResearchEvent,
  { eventType: "plan-definition" }
>;
type ResearchPlanOperationEvent = Extract<
  ResearchEvent,
  { eventType: "plan-operation" }
>;
type ResearchPlanOutputEvent = Extract<
  ResearchEvent,
  { eventType: "plan-output" }
>;
type ResearchTaskDefinitionEvent = Extract<
  ResearchEvent,
  { eventType: "task-definition" }
>;
type ResearchTaskOperationEvent = Extract<
  ResearchEvent,
  { eventType: "task-operation" }
>;
type ResearchTaskOutputEvent = Extract<
  ResearchEvent,
  { eventType: "task-output" }
>;

export type {
  ResearchDefinitionEvent,
  ResearchOutputEvent,
  ResearchPlanDefinitionEvent,
  ResearchPlanOperationEvent,
  ResearchPlanOutputEvent,
  ResearchTaskDefinitionEvent,
  ResearchTaskOperationEvent,
  ResearchTaskOutputEvent,
};
