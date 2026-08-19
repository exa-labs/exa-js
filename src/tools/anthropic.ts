import type { Exa } from "../index";
import {
  createSearchTool,
  type ExaToolSpec,
  type SearchToolConfig,
  ToolRegistry,
  getTool,
  unknownToolError,
} from "./core";
import type { ToolDefinition } from "./core";

type AnthropicToolUse = {
  type: "tool_use";
  id: string;
  name: string;
  input: unknown;
};

type AnthropicMessage = {
  content?: readonly unknown[] | null;
};

type AnthropicToolResult = {
  type: "tool_result";
  tool_use_id: string;
  content: string;
};

type AnthropicRunnable = ExaToolSpec & {
  type: "custom";
  name: string;
  description: string;
  input_schema: ExaToolSpec["jsonSchema"];
  parse: (input: unknown) => unknown;
  run: (args: unknown) => Promise<string>;
  definition: ToolDefinition & {
    input_schema: ExaToolSpec["jsonSchema"];
  };
};

export class AnthropicTools {
  constructor(
    private readonly exa: Exa,
    private readonly registry: ToolRegistry
  ) {}

  /** Anthropic `web_search` tool. Defaults to `auto` + highlights. */
  search(config?: SearchToolConfig) {
    return runnable(createSearchTool(this.exa, this.registry, config));
  }

  /**
   * Run the `tool_use` blocks in an assistant message and return the matching
   * `tool_result` blocks. Every `tool_use` block is answered so the follow-up
   * request never omits a required result: a block whose name doesn't match a
   * known tool gets an `Error: unknown tool "<name>"` result. When handling
   * some tools yourself, replace those error results with your own before
   * sending the next request.
   */
  async handleToolUse(
    message: AnthropicMessage,
    options?: { tools?: readonly ExaToolSpec[] }
  ): Promise<AnthropicToolResult[]> {
    const tools = this.registry.resolve(options?.tools);
    const blocks = (message.content ?? []).filter(isAnthropicToolUse);
    return Promise.all(
      blocks.map(async (block) => {
        const tool = getTool(tools, block.name);
        return {
          type: "tool_result" as const,
          tool_use_id: block.id,
          content: tool
            ? await tool.run(block.input)
            : unknownToolError(block.name),
        };
      })
    );
  }
}

function isAnthropicToolUse(value: unknown): value is AnthropicToolUse {
  if (!value || typeof value !== "object") return false;
  const block = value as Partial<AnthropicToolUse>;
  return (
    block.type === "tool_use" &&
    typeof block.id === "string" &&
    typeof block.name === "string"
  );
}

function runnable(tool: ExaToolSpec): AnthropicRunnable {
  const definition = {
    type: "custom" as const,
    name: tool.name,
    description: tool.description,
    input_schema: tool.jsonSchema,
    parse: (input: unknown) => tool.inputSchema.parse(input),
    run: (args: unknown) => tool.run(args),
  };
  Object.defineProperties(definition, {
    parse: { enumerable: false },
    run: { enumerable: false },
  });
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
  Object.defineProperty(definition, "type", {
    value: "custom",
    enumerable: false,
    configurable: true,
  });
  Object.defineProperty(definition, "definition", {
    value: {
      name: tool.name,
      description: tool.description,
      input_schema: tool.jsonSchema,
    },
    enumerable: false,
  });
  return definition as AnthropicRunnable;
}
