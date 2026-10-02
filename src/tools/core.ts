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

export type WebSearchToolConfig = RegularSearchOptions & {
  /**
   * Tool name shown to the model. Defaults to `"web_search"`. Set a custom
   * name to avoid collisions, e.g. with Anthropic's built-in `web_search`
   * server tool, or to register multiple differently-configured search tools.
   */
  name?: string;
  /** Tool description shown to the model. */
  description?: string;
};

export type GetContentsToolConfig = ContentsOptions & {
  /**
   * Tool name shown to the model. Defaults to `"get_contents"`. Set a custom
   * name to avoid collisions, or to register multiple differently-configured
   * contents tools.
   */
  name?: string;
  /** Tool description shown to the model. */
  description?: string;
};

export type ToolNamespace = {
  webSearch(config?: WebSearchToolConfig): WebSearchTool;
  getContents(config?: GetContentsToolConfig): GetContentsTool;
};

type SearchArgs = { query: string; objective?: string };
type GetContentsArgs = { urls: string[] };
type FormattableResult = {
  title?: string | null;
  url?: string;
  publishedDate?: string;
  author?: string;
  highlights?: string[];
  text?: string;
  summary?: string;
};

export type WebSearchTool = ExaToolSpec<
  SearchArgs,
  SearchResponse<ContentsOptions>
>;

export type GetContentsTool = ExaToolSpec<
  GetContentsArgs,
  SearchResponse<ContentsOptions>
>;

export const DEFAULT_WEB_SEARCH_TOOL_DESCRIPTION =
  "Search the web for up-to-date, relevant information. Describe the ideal page rather than listing keywords.";

export const DEFAULT_GET_CONTENTS_TOOL_DESCRIPTION =
  "Read the full contents of web pages you already have URLs for, such as pages returned by a search or mentioned by the user.";

/** Model-facing description of the `objective` search tool parameter. */
export const SEARCH_OBJECTIVE_TOOL_DESCRIPTION =
  "Goal for this search turn; say which documents should rank first, which should be excluded, and what specific facts or figures to pull from them.";

const MAX_OBJECTIVE_LENGTH = 4096;

function formatResults(
  response: SearchResponse<ContentsOptions>,
  emptyMessage: string
): string {
  const formatted = (response.results as FormattableResult[])
    .map((result) => {
      const lines = [
        `Title: ${result.title || "N/A"}`,
        `URL: ${result.url || "N/A"}`,
        `Published: ${result.publishedDate || "N/A"}`,
        `Author: ${result.author || "N/A"}`,
      ];
      if (result.summary) {
        lines.push(`Summary: ${result.summary}`);
      }
      if (result.highlights && result.highlights.length > 0) {
        lines.push(`Highlights:\n${result.highlights.join("\n")}`);
      } else if (result.text) {
        lines.push(`Text: ${result.text}`);
      }
      return lines.join("\n");
    })
    .join("\n\n---\n\n");
  return formatted || emptyMessage;
}

function formatSearchResponse(
  response: SearchResponse<ContentsOptions>
): string {
  return formatResults(response, "No search results found.");
}

function formatContentsResponse(
  response: SearchResponse<ContentsOptions>
): string {
  return formatResults(response, "No contents found.");
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

/**
 * Optional when parsing, but listed in the JSON schema's `required` so models
 * fill it in on every call. `zod-to-json-schema` decides `required` from
 * `isOptional()`.
 */
class AdvertisedRequiredOptional<
  T extends z.ZodTypeAny,
> extends z.ZodOptional<T> {
  isOptional(): boolean {
    return false;
  }
}

function advertisedRequired<T extends z.ZodTypeAny>(
  inner: T
): AdvertisedRequiredOptional<T> {
  return new AdvertisedRequiredOptional({
    innerType: inner,
    typeName: z.ZodFirstPartyTypeKind.ZodOptional,
  });
}

/** Create a `web_search` tool. Defaults to `type: "auto"` and highlights. */
export function createWebSearchTool(
  exa: Exa,
  registry: ToolRegistry,
  config: WebSearchToolConfig = {}
): WebSearchTool {
  const {
    name = "web_search",
    description = DEFAULT_WEB_SEARCH_TOOL_DESCRIPTION,
    ...searchOptions
  } = config;
  const inputSchema = z.object({
    query: z
      .string()
      .describe(
        "Natural language search query. Should be a semantically rich description of the ideal page, not just keywords."
      ),
    // Length limits are validated but not advertised: strict tool use on some
    // providers rejects `minLength`/`maxLength` in the schema.
    objective: advertisedRequired(
      z
        .string()
        .trim()
        .refine((value) => value.length > 0, "objective must not be empty")
        .refine(
          (value) => value.length <= MAX_OBJECTIVE_LENGTH,
          `objective must be at most ${MAX_OBJECTIVE_LENGTH} characters`
        )
    ).describe(SEARCH_OBJECTIVE_TOOL_DESCRIPTION),
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
    execute: ({ query, objective }) => {
      const options = {
        type: "auto",
        numResults: 10,
        contents: { highlights: true },
        ...searchOptions,
        ...(objective !== undefined && { objective }),
      } as RegularSearchOptions;
      return exa.search(query, options) as Promise<
        SearchResponse<ContentsOptions>
      >;
    },
    format: formatSearchResponse,
  }) as WebSearchTool;
}

function hasContentOption(options: ContentsOptions): boolean {
  return (
    options.text !== undefined ||
    options.highlights !== undefined ||
    options.summary !== undefined ||
    options.extras !== undefined
  );
}

/**
 * Create a `get_contents` tool that reads pages the model already has URLs for.
 * Defaults to `highlights: true` when no content option (`text`, `highlights`,
 * `summary`, `extras`) is configured.
 */
export function createGetContentsTool(
  exa: Exa,
  registry: ToolRegistry,
  config: GetContentsToolConfig = {}
): GetContentsTool {
  const {
    name = "get_contents",
    description = DEFAULT_GET_CONTENTS_TOOL_DESCRIPTION,
    ...configuredOptions
  } = config;
  const contentsOptions: ContentsOptions = hasContentOption(configuredOptions)
    ? configuredOptions
    : { ...configuredOptions, highlights: true };
  const inputSchema = z.object({
    urls: z
      .array(z.string())
      .describe(
        "Absolute URLs of the pages to read, including the scheme. Pass several URLs to read them in a single call."
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
    execute: ({ urls }) =>
      exa.getContents(urls, contentsOptions) as Promise<
        SearchResponse<ContentsOptions>
      >,
    format: formatContentsResponse,
  }) as GetContentsTool;
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
