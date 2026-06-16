/**
 * Types for Exa's OpenAI-compatible Responses API.
 */

export type AgentResponseModel = "agent" | "exa-agent";

export type AgentResponseEffort =
  | "minimal"
  | "low"
  | "medium"
  | "high"
  | "xhigh"
  | "auto";

export type ResponseStatus =
  | "completed"
  | "failed"
  | "incomplete"
  | "queued"
  | "running";

export interface ResponseReasoningParam {
  /**
   * Agent effort mode.
   */
  effort?: AgentResponseEffort | null;
  [key: string]: unknown;
}

export interface ResponseTextFormatParam {
  type: string;
  name?: string;
  schema?: Record<string, unknown>;
  strict?: boolean;
  [key: string]: unknown;
}

export interface ResponseTextConfigParam {
  format?: ResponseTextFormatParam;
  [key: string]: unknown;
}

export interface ResponseInputMessage {
  role: "user" | "assistant" | "system" | "developer";
  content: string | Array<Record<string, unknown>>;
  type?: "message";
  phase?: "commentary" | "final_answer";
  [key: string]: unknown;
}

export type ResponseInput = string | ResponseInputMessage[];

export interface ResponseCreateParams {
  /**
   * Text or message inputs for the Agent response.
   */
  input: ResponseInput;
  /**
   * Responses model. Defaults to "agent".
   */
  model?: AgentResponseModel | string;
  /**
   * Agent effort configuration. `reasoning.effort` maps to the Agent effort mode.
   */
  reasoning?: ResponseReasoningParam | null;
  instructions?: string | null;
  previous_response_id?: string | null;
  metadata?: Record<string, string> | null;
  text?: ResponseTextConfigParam;
  stream?: false | null;
  temperature?: number | null;
  top_p?: number | null;
  tools?: Array<Record<string, unknown>>;
  tool_choice?: unknown;
  max_output_tokens?: number | null;
  store?: boolean | null;
  [key: string]: unknown;
}

export interface ResponseOutputText {
  type: "output_text";
  text: string;
  annotations: unknown[];
  [key: string]: unknown;
}

export interface ResponseOutputMessage {
  id?: string;
  type: "message";
  status: "completed" | "incomplete" | "in_progress";
  role: "assistant";
  content: ResponseOutputText[];
  [key: string]: unknown;
}

export interface ResponseError {
  code?: string;
  message?: string;
  [key: string]: unknown;
}

export interface ResponseIncompleteDetails {
  reason?: string;
  [key: string]: unknown;
}

export interface Response {
  id: string;
  object: "response";
  created_at: number;
  completed_at?: number | null;
  status: ResponseStatus;
  model: string;
  output: ResponseOutputMessage[];
  output_text: string;
  error: ResponseError | null;
  incomplete_details: ResponseIncompleteDetails | null;
  instructions: string | null;
  previous_response_id?: string | null;
  metadata: Record<string, string> | null;
  tools: unknown[];
  tool_choice: unknown;
  parallel_tool_calls: boolean;
  temperature: number | null;
  top_p: number | null;
  reasoning?: Record<string, unknown> | null;
  usage?: Record<string, unknown> | null;
  [key: string]: unknown;
}
