import { z } from "zod";
import type {
  ContentsOptions,
  RegularSearchOptions,
  SearchResponse,
} from "../index";
import type { Exa } from "../index";
import { zodToJsonSchema } from "../zod-utils";

export type ToolJsonSchema = {
  type: "object";
  properties?: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
  [key: string]: unknown;
};

export type ToolDefinition = {
  name: string;
  description: string;
  parameters?: ToolJsonSchema;
  input_schema?: ToolJsonSchema;
  strict?: boolean;
};

export type ExaToolSpec<Args = unknown, Result = unknown> = {
  name: string;
  description: string;
  inputSchema: z.ZodType<Args>;
  jsonSchema: ToolJsonSchema;
  execute(args: Args): Promise<Result>;
  format(result: Result): string;
  definition: ToolDefinition;
  run(args: unknown): Promise<string>;
};

export type SearchToolConfig = RegularSearchOptions & {
  /**
   * Tool name shown to the model. Defaults to `"web_search"`. Set a custom
   * name to avoid collisions, e.g. with Anthropic's built-in `web_search`
   * server tool, or to register multiple differently-configured search tools.
   */
  name?: string;
  /** Tool description shown to the model. */
  description?: string;
};

export type ToolNamespace = {
  search(config?: SearchToolConfig): SearchTool;
};

type SearchArgs = { query: string };
type FormattableResult = {
  title?: string | null;
  url?: string;
  publishedDate?: string;
  author?: string;
  highlights?: string[];
  text?: string;
};

export type SearchTool = ExaToolSpec<
  SearchArgs,
  SearchResponse<ContentsOptions>
>;

export const DEFAULT_SEARCH_TOOL_DESCRIPTION =
  "Search the web for up-to-date, relevant information. Describe the ideal page rather than listing keywords.";

function formatSearchResponse(
  response: SearchResponse<ContentsOptions>
): string {
  const formatted = (response.results as FormattableResult[])
    .map((result) => {
      const lines = [
        `Title: ${result.title || "N/A"}`,
        `URL: ${result.url || "N/A"}`,
        `Published: ${result.publishedDate || "N/A"}`,
        `Author: ${result.author || "N/A"}`,
      ];
      if (result.highlights && result.highlights.length > 0) {
        lines.push(`Highlights:\n${result.highlights.join("\n")}`);
      } else if (result.text) {
        lines.push(`Text: ${result.text}`);
      }
      return lines.join("\n");
    })
    .join("\n\n---\n\n");
  return formatted || "No search results found.";
}

function registerTool<T extends ExaToolSpec>(
  registry: ToolRegistry,
  tool: T
): T {
  registry.register(tool);
  return tool;
}

function createTool<TArgs, TResult>(
  registry: ToolRegistry,
  params: {
    name: string;
    description: string;
    inputSchema: z.ZodType<TArgs>;
    jsonSchema: ToolJsonSchema;
    execute(args: TArgs): Promise<TResult>;
    format(result: TResult): string;
    definition: ToolDefinition;
  }
): ExaToolSpec<TArgs, TResult> {
  const tool: ExaToolSpec<TArgs, TResult> = {
    name: params.name,
    description: params.description,
    inputSchema: params.inputSchema,
    jsonSchema: params.jsonSchema,
    execute: params.execute,
    format: params.format,
    definition: params.definition,
    async run(args: unknown): Promise<string> {
      try {
        const parsed = params.inputSchema.parse(args);
        const result = await params.execute(parsed);
        return params.format(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return `Error: ${message}`;
      }
    },
  };
  return registerTool(registry, tool);
}

/** Create a `web_search` tool. Defaults to `type: "auto"` and highlights. */
export function createSearchTool(
  exa: Exa,
  registry: ToolRegistry,
  config: SearchToolConfig = {}
): SearchTool {
  const {
    name = "web_search",
    description = DEFAULT_SEARCH_TOOL_DESCRIPTION,
    ...searchOptions
  } = config;
  const inputSchema = z.object({
    query: z
      .string()
      .describe(
        "Natural language search query. Should be a semantically rich description of the ideal page, not just keywords."
      ),
  });
  const jsonSchema = zodToJsonSchema(inputSchema) as ToolJsonSchema;
  delete jsonSchema.$schema;

  return createTool(registry, {
    name,
    description,
    inputSchema,
    jsonSchema,
    definition: {
      name,
      description,
      parameters: jsonSchema,
    },
    execute: ({ query }) => {
      const options = {
        type: "auto",
        numResults: 10,
        contents: { highlights: true },
        ...searchOptions,
      } as RegularSearchOptions;
      return exa.search(query, options) as Promise<
        SearchResponse<ContentsOptions>
      >;
    },
    format: formatSearchResponse,
  }) as SearchTool;
}

export class ToolRegistry {
  private readonly registry = new Map<string, ExaToolSpec>();

  register(tool: ExaToolSpec): void {
    this.registry.set(tool.name, tool);
  }

  resolve(tools?: readonly ExaToolSpec[]): Map<string, ExaToolSpec> {
    return tools
      ? new Map(tools.map((tool) => [tool.name, tool]))
      : new Map(this.registry);
  }
}

export function getTool(
  tools: Map<string, ExaToolSpec>,
  name: string
): ExaToolSpec | undefined {
  return tools.get(name);
}

export function unknownToolError(name: string): string {
  return `Error: unknown tool "${name}"`;
}
