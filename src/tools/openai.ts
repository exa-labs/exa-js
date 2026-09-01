import type { Exa } from "../index";
import {
  createGetContentsTool,
  createWebSearchTool,
  type ExaToolSpec,
  type GetContentsToolConfig,
  type WebSearchToolConfig,
  type ToolDefinition,
  type ToolJsonSchema,
  ToolRegistry,
  getTool,
  unknownToolError,
} from "./core";

type OpenAIToolCall = {
  id: string;
  function: { name: string; arguments: string };
};

type OpenAIAssistantMessage = {
  tool_calls?: readonly unknown[] | null;
};

export type OpenAIToolMessage = {
  role: "tool";
  tool_call_id: string;
  content: string;
};

type ResponsesFunctionCall = {
  type: "function_call";
  call_id: string;
  name: string;
  arguments: string;
};

type ResponsesOutput = {
  output?: readonly unknown[];
};

export type ResponsesFunctionCallOutput = {
  type: "function_call_output";
  call_id: string;
  output: string;
};

type OpenAIChatDefinition = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: any;
  };
};

type OpenAIRunnable = ExaToolSpec & {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: any;
    parse: (input: string) => any;
    function: (args: any, runner?: unknown) => Promise<string>;
  };
  definition: OpenAIChatDefinition;
};

type OpenAIResponsesRunnable = ExaToolSpec & {
  type: "function";
  name: string;
  description: string;
  parameters: any;
  strict: false;
  definition: ToolDefinition & {
    type: "function";
    parameters: ToolJsonSchema;
    strict: false;
  };
};

function runnable(tool: ExaToolSpec): OpenAIRunnable {
  const functionDefinition = {
    ...tool.definition,
    parse: (input: string) => JSON.parse(input),
    function: (args: any) => tool.run(args),
  };
  Object.defineProperties(functionDefinition, {
    parse: { enumerable: false },
    function: { enumerable: false },
  });
  const definition = {
    type: "function" as const,
    function: functionDefinition,
  };
  Object.defineProperties(
    definition,
    Object.fromEntries(
      Object.entries(tool)
        .filter(([key]) => !["name", "description"].includes(key))
        .map(([key, value]) => [
          key,
          { value, enumerable: false, configurable: true },
        ])
    )
  );
  Object.defineProperties(definition, {
    name: {
      value: tool.name,
      enumerable: false,
      configurable: true,
    },
    description: {
      value: tool.description,
      enumerable: false,
      configurable: true,
    },
  });
  Object.defineProperty(definition, "definition", {
    value: {
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.jsonSchema,
      },
    } satisfies OpenAIChatDefinition,
    enumerable: false,
    configurable: true,
  });
  return definition as OpenAIRunnable;
}

export class OpenAIResponsesTools {
  constructor(
    private readonly exa: Exa,
    private readonly registry: ToolRegistry,
    private readonly handleResponses: (
      responseOrOutputItems: ResponsesOutput | readonly unknown[],
      options?: { tools?: readonly ExaToolSpec[] }
    ) => Promise<ResponsesFunctionCallOutput[]>
  ) {}

  /** Responses API `web_search` tool. Defaults to `auto` + highlights. */
  webSearch(config?: WebSearchToolConfig) {
    return responsesRunnable(
      createWebSearchTool(this.exa, this.registry, config)
    );
  }

  /** Responses API `get_contents` tool for reading pages by URL. */
  getContents(config?: GetContentsToolConfig) {
    return responsesRunnable(
      createGetContentsTool(this.exa, this.registry, config)
    );
  }

  /**
   * Run the function calls in a Responses API response (or output item array)
   * and return `function_call_output` items. Every function call is answered
   * so the follow-up request never omits a required output: a call whose name
   * doesn't match a known tool gets an `Error: unknown tool "<name>"` output.
   * When handling some tools yourself, replace those error outputs with your
   * own results before sending the next request.
   */
  async handleToolCalls(
    responseOrOutputItems: ResponsesOutput | readonly unknown[],
    options?: { tools?: readonly ExaToolSpec[] }
  ): Promise<ResponsesFunctionCallOutput[]> {
    return this.handleResponses(responseOrOutputItems, options);
  }
}

function responsesRunnable(tool: ExaToolSpec): OpenAIResponsesRunnable {
  const definition = {
    type: "function" as const,
    name: tool.name,
    description: tool.description,
    parameters: tool.jsonSchema,
    strict: false,
  };
  Object.defineProperties(
    definition,
    Object.fromEntries(
      Object.entries(tool)
        .filter(([key]) => !["name", "description"].includes(key))
        .map(([key, value]) => [
          key,
          { value, enumerable: false, configurable: true },
        ])
    )
  );
  Object.defineProperty(definition, "definition", {
    value: {
      ...tool.definition,
      type: "function",
      parameters: tool.jsonSchema,
      strict: false,
    },
    enumerable: false,
  });
  return definition as OpenAIResponsesRunnable;
}

export class OpenAITools {
  readonly responses: OpenAIResponsesTools;

  constructor(
    private readonly exa: Exa,
    private readonly registry: ToolRegistry
  ) {
    this.responses = new OpenAIResponsesTools(
      exa,
      registry,
      (responseOrOutputItems, options) =>
        this.handleResponsesToolCalls(responseOrOutputItems, options)
    );
  }

  /** Chat Completions `web_search` tool. Defaults to `auto` + highlights. */
  webSearch(config?: WebSearchToolConfig) {
    return runnable(createWebSearchTool(this.exa, this.registry, config));
  }

  /** Chat Completions `get_contents` tool for reading pages by URL. */
  getContents(config?: GetContentsToolConfig) {
    return runnable(createGetContentsTool(this.exa, this.registry, config));
  }

  /**
   * Run the tool calls in a Chat Completions assistant message and return the
   * matching `role: "tool"` messages. Every tool call is answered so the
   * follow-up request never omits a required tool response: a call whose name
   * doesn't match a known tool gets an `Error: unknown tool "<name>"` output.
   * When handling some tools yourself, replace those error outputs with your
   * own results before sending the next request.
   */
  handleToolCalls(
    assistantMessage: OpenAIAssistantMessage,
    options?: { tools?: readonly ExaToolSpec[] }
  ): Promise<OpenAIToolMessage[]>;
  /**
   * Run the function calls in a Responses API response (or output item array)
   * and return `function_call_output` items, answering calls whose name
   * doesn't match a known tool with `Error: unknown tool "<name>"` outputs.
   */
  handleToolCalls(
    responseOrOutputItems: ResponsesOutput | readonly unknown[],
    options?: { tools?: readonly ExaToolSpec[] }
  ): Promise<ResponsesFunctionCallOutput[]>;
  async handleToolCalls(
    assistantMessage:
      | OpenAIAssistantMessage
      | ResponsesOutput
      | readonly unknown[],
    options?: { tools?: readonly ExaToolSpec[] }
  ): Promise<(OpenAIToolMessage | ResponsesFunctionCallOutput)[]> {
    if (isResponsesInput(assistantMessage)) {
      return this.handleResponsesToolCalls(assistantMessage, options);
    }
    return this.handleChatToolCalls(assistantMessage, options);
  }

  private async handleChatToolCalls(
    assistantMessage: OpenAIAssistantMessage,
    options?: { tools?: readonly ExaToolSpec[] }
  ): Promise<OpenAIToolMessage[]> {
    const tools = this.registry.resolve(options?.tools);
    const calls = (assistantMessage.tool_calls ?? []).filter(isOpenAIToolCall);
    return Promise.all(
      calls.map(async (call) => {
        const tool = getTool(tools, call.function.name);
        return {
          role: "tool" as const,
          tool_call_id: call.id,
          content: tool
            ? await tool.run(parseArguments(call.function.arguments))
            : unknownToolError(call.function.name),
        };
      })
    );
  }

  private async handleResponsesToolCalls(
    responseOrOutputItems: ResponsesOutput | readonly unknown[],
    options?: { tools?: readonly ExaToolSpec[] }
  ): Promise<ResponsesFunctionCallOutput[]> {
    const tools = this.registry.resolve(options?.tools);
    const rawItems: readonly unknown[] =
      !Array.isArray(responseOrOutputItems) && "output" in responseOrOutputItems
        ? (responseOrOutputItems.output ?? [])
        : (responseOrOutputItems as readonly unknown[]);
    const items = rawItems.filter(isResponsesFunctionCall);
    return Promise.all(
      items.map(async (call) => {
        const tool = getTool(tools, call.name);
        return {
          type: "function_call_output" as const,
          call_id: call.call_id,
          output: tool
            ? await tool.run(parseArguments(call.arguments))
            : unknownToolError(call.name),
        };
      })
    );
  }
}

function parseArguments(argumentsText: string): unknown {
  try {
    return JSON.parse(argumentsText);
  } catch {
    return argumentsText;
  }
}

function isOpenAIToolCall(value: unknown): value is OpenAIToolCall {
  if (!value || typeof value !== "object") return false;
  const call = value as Partial<OpenAIToolCall>;
  return (
    typeof call.id === "string" &&
    !!call.function &&
    typeof call.function.name === "string" &&
    typeof call.function.arguments === "string"
  );
}

function isResponsesFunctionCall(
  value: unknown
): value is ResponsesFunctionCall {
  if (!value || typeof value !== "object") return false;
  const call = value as Partial<ResponsesFunctionCall>;
  return (
    call.type === "function_call" &&
    typeof call.call_id === "string" &&
    typeof call.name === "string" &&
    typeof call.arguments === "string"
  );
}

function isResponsesInput(
  value: OpenAIAssistantMessage | ResponsesOutput | readonly unknown[]
): value is ResponsesOutput | readonly unknown[] {
  if (Array.isArray(value)) return value.some(isResponsesFunctionCall);
  return "output" in value;
}
