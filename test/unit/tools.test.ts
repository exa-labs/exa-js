import type Anthropic from "@anthropic-ai/sdk";
import type OpenAI from "openai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Exa from "../../src";

describe("LLM tools", () => {
  let exa: Exa;

  beforeEach(() => {
    exa = new Exa("test-api-key", "https://api.exa.ai");
  });

  it("creates a query-only neutral search tool with MCP defaults", async () => {
    const request = vi.spyOn(exa, "request").mockResolvedValue({
      requestId: "request-1",
      results: [
        {
          id: "result-1",
          title: "Example",
          url: "https://example.com",
          publishedDate: "2026-01-01",
          author: "Author",
          highlights: ["A useful highlight."],
        },
      ],
    });

    const tool = exa.tools.webSearch();
    expect(tool.name).toBe("web_search");
    expect(tool.jsonSchema).toMatchObject({
      type: "object",
      required: ["query"],
    });
    expect(tool.jsonSchema).not.toHaveProperty("$schema");
    expect(tool.definition).not.toHaveProperty("run");
    expect(tool.definition).not.toHaveProperty("execute");
    expect(tool.definition).not.toHaveProperty("parse");

    const output = await tool.run({ query: "latest AI news" });
    expect(output).toContain("Title: Example");
    expect(output).toContain("Highlights:\nA useful highlight.");
    expect(request).toHaveBeenCalledWith("/search", "POST", {
      query: "latest AI news",
      type: "auto",
      numResults: 10,
      contents: { highlights: true },
    });
  });

  it("serializes each provider tool to its exact wire descriptor", () => {
    const openaiTool = exa.openai.webSearch();
    const responsesTool = exa.openai.responses.webSearch();
    const anthropicTool = exa.anthropic.webSearch();

    expect(JSON.parse(JSON.stringify(openaiTool))).toEqual({
      type: "function",
      function: {
        name: openaiTool.name,
        description: openaiTool.description,
        parameters: openaiTool.jsonSchema,
      },
    });
    expect(openaiTool.jsonSchema).not.toHaveProperty("$schema");
    expect(responsesTool.jsonSchema).not.toHaveProperty("$schema");
    expect(anthropicTool.jsonSchema).not.toHaveProperty("$schema");
    expect(openaiTool.definition).toEqual({
      type: "function",
      function: {
        name: openaiTool.name,
        description: openaiTool.description,
        parameters: openaiTool.jsonSchema,
      },
    });
    expect(JSON.parse(JSON.stringify(responsesTool))).toEqual({
      type: "function",
      name: responsesTool.name,
      description: responsesTool.description,
      parameters: responsesTool.jsonSchema,
      strict: false,
    });
    expect(JSON.parse(JSON.stringify(anthropicTool))).toEqual({
      name: anthropicTool.name,
      description: anthropicTool.description,
      input_schema: anthropicTool.jsonSchema,
    });
  });

  it("supports configured search options", async () => {
    vi.spyOn(exa, "request").mockResolvedValue({
      requestId: "request-1",
      results: [
        {
          id: "result-1",
          title: "Example",
          url: "https://example.com",
          highlights: ["0123456789"],
        },
      ],
    });

    const tool = exa.openai.webSearch({
      type: "neural",
      numResults: 3,
      contents: { highlights: { maxCharacters: 100 } },
    });
    const output = await tool.run({ query: "query" });

    expect(tool.name).toBe("web_search");
    expect(output).toContain("0123456789");
    expect(exa.request).toHaveBeenCalledWith("/search", "POST", {
      query: "query",
      type: "neural",
      numResults: 3,
      contents: {
        highlights: { maxCharacters: 100 },
      },
    });
    expect(exa.openai.responses.webSearch({}).definition).toEqual({
      type: "function",
      name: "web_search",
      description: expect.any(String),
      parameters: expect.any(Object),
      strict: false,
    });
  });

  it("serializes custom names and descriptions for every provider", async () => {
    const request = vi.spyOn(exa, "request").mockResolvedValue({
      requestId: "request-1",
      results: [],
    });
    const description = "Search the web with Exa.";
    const openaiTool = exa.openai.webSearch({
      name: "exa_chat_search",
      description,
    });
    const responsesTool = exa.openai.responses.webSearch({
      name: "exa_responses_search",
      description,
    });
    const anthropicTool = exa.anthropic.webSearch({
      name: "exa_anthropic_search",
      description,
    });

    expect(JSON.parse(JSON.stringify(openaiTool))).toEqual({
      type: "function",
      function: {
        name: "exa_chat_search",
        description,
        parameters: openaiTool.jsonSchema,
      },
    });
    expect(openaiTool.definition).toEqual({
      type: "function",
      function: {
        name: "exa_chat_search",
        description,
        parameters: openaiTool.jsonSchema,
      },
    });
    expect(JSON.parse(JSON.stringify(responsesTool))).toEqual({
      type: "function",
      name: "exa_responses_search",
      description,
      parameters: responsesTool.jsonSchema,
      strict: false,
    });
    expect(responsesTool.definition).toEqual({
      type: "function",
      name: "exa_responses_search",
      description,
      parameters: responsesTool.jsonSchema,
      strict: false,
    });
    expect(JSON.parse(JSON.stringify(anthropicTool))).toEqual({
      name: "exa_anthropic_search",
      description,
      input_schema: anthropicTool.jsonSchema,
    });
    expect(anthropicTool.definition).toEqual({
      name: "exa_anthropic_search",
      description,
      input_schema: anthropicTool.jsonSchema,
    });

    const chatMessages = await exa.openai.handleToolCalls({
      tool_calls: [
        {
          id: "call-1",
          function: { name: "exa_chat_search", arguments: '{"query":"q"}' },
        },
      ],
    });
    expect(chatMessages).toEqual([
      {
        role: "tool",
        tool_call_id: "call-1",
        content: "No search results found.",
      },
    ]);

    const responsesOutputs = await exa.openai.responses.handleToolCalls([
      {
        type: "function_call",
        call_id: "call-2",
        name: "exa_responses_search",
        arguments: '{"query":"q"}',
      },
    ]);
    expect(responsesOutputs).toEqual([
      {
        type: "function_call_output",
        call_id: "call-2",
        output: "No search results found.",
      },
    ]);

    const toolResults = await exa.anthropic.handleToolUse({
      content: [
        {
          type: "tool_use",
          id: "toolu-3",
          name: "exa_anthropic_search",
          input: { query: "q" },
        },
      ],
    });
    expect(toolResults).toEqual([
      {
        type: "tool_result",
        tool_use_id: "toolu-3",
        content: "No search results found.",
      },
    ]);
    expect(request).toHaveBeenCalledTimes(3);
  });

  it("keeps name and description out of the Exa search options", async () => {
    const request = vi.spyOn(exa, "request").mockResolvedValue({
      requestId: "request-1",
      results: [],
    });
    const tool = exa.anthropic.webSearch({
      name: "exa_web_search",
      description: "Custom description.",
      type: "keyword",
      numResults: 5,
    });

    await tool.run({ query: "q" });

    expect(request).toHaveBeenCalledWith("/search", "POST", {
      query: "q",
      type: "keyword",
      numResults: 5,
      contents: { highlights: true },
    });
  });

  it("registers differently named search tools side by side", async () => {
    const request = vi.spyOn(exa, "request").mockResolvedValue({
      requestId: "request-1",
      results: [],
    });
    exa.openai.webSearch({ type: "keyword" });
    exa.openai.webSearch({ name: "exa_neural_search", type: "neural" });

    await exa.openai.handleToolCalls({
      tool_calls: [
        {
          id: "call-1",
          function: { name: "web_search", arguments: '{"query":"a"}' },
        },
        {
          id: "call-2",
          function: { name: "exa_neural_search", arguments: '{"query":"b"}' },
        },
      ],
    });

    expect(request).toHaveBeenCalledWith("/search", "POST", {
      query: "a",
      type: "keyword",
      numResults: 10,
      contents: { highlights: true },
    });
    expect(request).toHaveBeenCalledWith("/search", "POST", {
      query: "b",
      type: "neural",
      numResults: 10,
      contents: { highlights: true },
    });
  });

  it("handles malformed arguments and unknown tools without throwing", async () => {
    const tool = exa.openai.webSearch();
    const messages = await exa.openai.handleToolCalls({
      tool_calls: [
        {
          id: "call-1",
          function: { name: tool.name, arguments: "not-json" },
        },
        {
          id: "call-2",
          function: { name: "user_owned_tool", arguments: "{}" },
        },
      ],
    });

    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({
      role: "tool",
      tool_call_id: "call-1",
    });
    expect((messages[0] as { content: string }).content).toMatch(/^Error:/);
    expect(messages[1]).toEqual({
      role: "tool",
      tool_call_id: "call-2",
      content: 'Error: unknown tool "user_owned_tool"',
    });
  });

  it("answers unknown tool calls with error outputs in every handler path", async () => {
    const chatMessages = await exa.openai.handleToolCalls({
      tool_calls: [
        { id: "call-a", function: { name: "mystery_tool", arguments: "{}" } },
      ],
    });
    expect(chatMessages).toEqual([
      {
        role: "tool",
        tool_call_id: "call-a",
        content: 'Error: unknown tool "mystery_tool"',
      },
    ]);

    const responsesOutputs = await exa.openai.responses.handleToolCalls([
      {
        type: "function_call",
        call_id: "call-b",
        name: "mystery_tool",
        arguments: "{}",
      },
    ]);
    expect(responsesOutputs).toEqual([
      {
        type: "function_call_output",
        call_id: "call-b",
        output: 'Error: unknown tool "mystery_tool"',
      },
    ]);

    const toolResults = await exa.anthropic.handleToolUse({
      content: [
        { type: "tool_use", id: "toolu-c", name: "mystery_tool", input: {} },
      ],
    });
    expect(toolResults).toEqual([
      {
        type: "tool_result",
        tool_use_id: "toolu-c",
        content: 'Error: unknown tool "mystery_tool"',
      },
    ]);
  });

  it("runs parallel search tool calls", async () => {
    const request = vi.spyOn(exa, "request").mockResolvedValue({
      requestId: "request-1",
      results: [
        {
          id: "result-1",
          title: "Example",
          url: "https://example.com",
          text: "Page text",
        },
      ],
    });
    const search = exa.openai.webSearch();

    const messages = await exa.openai.handleToolCalls({
      tool_calls: [
        {
          id: "call-search",
          function: { name: search.name, arguments: '{"query":"one"}' },
        },
        {
          id: "call-second-search",
          function: { name: search.name, arguments: '{"query":"two"}' },
        },
      ],
    });

    expect(messages).toHaveLength(2);
    expect(request).toHaveBeenCalledTimes(2);
    expect(request).toHaveBeenCalledWith("/search", "POST", {
      query: "two",
      type: "auto",
      numResults: 10,
      contents: { highlights: true },
    });
  });

  it("uses the last registered tool and honors explicit overrides", async () => {
    const request = vi.spyOn(exa, "request").mockResolvedValue({
      requestId: "request-1",
      results: [],
    });
    const first = exa.openai.webSearch({ type: "neural" });
    const second = exa.openai.webSearch({ type: "keyword" });

    await exa.openai.handleToolCalls({
      tool_calls: [
        {
          id: "call-last",
          function: { name: second.name, arguments: '{"query":"last"}' },
        },
      ],
    });
    expect(request).toHaveBeenLastCalledWith("/search", "POST", {
      query: "last",
      type: "keyword",
      numResults: 10,
      contents: { highlights: true },
    });

    await exa.openai.handleToolCalls(
      {
        tool_calls: [
          {
            id: "call-override",
            function: { name: first.name, arguments: '{"query":"first"}' },
          },
        ],
      },
      { tools: [first] }
    );
    expect(request).toHaveBeenLastCalledWith("/search", "POST", {
      query: "first",
      type: "neural",
      numResults: 10,
      contents: { highlights: true },
    });
  });

  it("formats Anthropic tool results and Responses outputs", async () => {
    vi.spyOn(exa, "request").mockResolvedValue({
      requestId: "request-1",
      results: [
        {
          id: "result-1",
          title: "Example",
          url: "https://example.com",
          text: "Page text",
        },
      ],
    });
    const search = exa.anthropic.webSearch();
    expect(search.definition).not.toHaveProperty("parse");
    expect(search.definition).not.toHaveProperty("run");
    const anthropicResults = await exa.anthropic.handleToolUse({
      content: [
        {
          type: "tool_use",
          id: "tool-use-1",
          name: search.name,
          input: { query: "news" },
        },
      ],
    });
    expect(anthropicResults).toEqual([
      {
        type: "tool_result",
        tool_use_id: "tool-use-1",
        content: expect.stringContaining("Title: Example"),
      },
    ]);
    expect(anthropicResults[0].content).toContain("Text: Page text");

    const responseTool = exa.openai.responses.webSearch();
    const functionCalls = [
      {
        type: "function_call",
        call_id: "call-1",
        name: responseTool.name,
        arguments: '{"query":"news"}',
      },
    ];
    const responseResults =
      await exa.openai.responses.handleToolCalls(functionCalls);
    const unifiedResults = await exa.openai.handleToolCalls(functionCalls);
    expect(responseResults).toEqual([
      {
        type: "function_call_output",
        call_id: "call-1",
        output: expect.stringContaining("Title: Example"),
      },
    ]);
    expect(unifiedResults).toEqual(responseResults);
  });

  it("satisfies the provider SDK tool and message types", async () => {
    vi.spyOn(exa, "request").mockResolvedValue({
      requestId: "request-1",
      results: [],
    });

    const anthropicTool: Anthropic.Messages.Tool = exa.anthropic.webSearch();
    const chatTool: OpenAI.Chat.Completions.ChatCompletionTool =
      exa.openai.webSearch();
    const responsesTool: OpenAI.Responses.Tool =
      exa.openai.responses.webSearch();

    const assistantMessage: OpenAI.Chat.Completions.ChatCompletionAssistantMessageParam =
      {
        role: "assistant",
        tool_calls: [
          {
            id: "call-1",
            type: "function",
            function: {
              name: chatTool.function.name,
              arguments: '{"query":"q"}',
            },
          },
        ],
      };
    const toolMessages: OpenAI.Chat.Completions.ChatCompletionToolMessageParam[] =
      await exa.openai.handleToolCalls(assistantMessage);
    expect(toolMessages).toEqual([
      {
        role: "tool",
        tool_call_id: "call-1",
        content: "No search results found.",
      },
    ]);

    const outputs: OpenAI.Responses.ResponseInputItem.FunctionCallOutput[] =
      await exa.openai.handleToolCalls([
        {
          type: "function_call",
          call_id: "call-2",
          name: "web_search",
          arguments: '{"query":"q"}',
        },
      ]);
    expect(outputs[0].type).toBe("function_call_output");

    const toolResults: Anthropic.Messages.ToolResultBlockParam[] =
      await exa.anthropic.handleToolUse({
        content: [
          {
            type: "tool_use",
            id: "toolu-1",
            name: anthropicTool.name,
            input: { query: "q" },
          },
        ],
      });
    expect(toolResults[0].type).toBe("tool_result");
    expect(responsesTool.type).toBe("function");
  });

  it("creates a urls-only neutral contents tool", async () => {
    const request = vi.spyOn(exa, "request").mockResolvedValue({
      requestId: "request-1",
      results: [
        {
          id: "result-1",
          title: "Example",
          url: "https://example.com",
          text: "Page text",
        },
      ],
    });

    const tool = exa.tools.getContents();
    expect(tool.name).toBe("get_contents");
    expect(tool.jsonSchema).toMatchObject({
      type: "object",
      required: ["urls"],
    });
    expect(tool.jsonSchema).not.toHaveProperty("$schema");
    expect(tool.definition).not.toHaveProperty("run");

    const output = await tool.run({ urls: ["https://example.com"] });
    expect(output).toContain("Title: Example");
    expect(output).toContain("Text: Page text");
    expect(request).toHaveBeenCalledWith("/contents", "POST", {
      urls: ["https://example.com"],
    });
  });

  it("passes configured contents options through to /contents", async () => {
    const request = vi.spyOn(exa, "request").mockResolvedValue({
      requestId: "request-1",
      results: [
        {
          id: "result-1",
          title: "Example",
          url: "https://example.com",
          summary: "A summary",
        },
      ],
    });

    const tool = exa.openai.getContents({
      name: "read_pages",
      description: "Read pages",
      summary: true,
      livecrawl: "preferred",
    });
    const output = await tool.run({
      urls: ["https://example.com", "https://exa.ai"],
    });

    expect(output).toContain("Summary: A summary");
    expect(request).toHaveBeenCalledWith("/contents", "POST", {
      urls: ["https://example.com", "https://exa.ai"],
      summary: true,
      livecrawl: "preferred",
    });
    expect(JSON.parse(JSON.stringify(tool))).toEqual({
      type: "function",
      function: {
        name: "read_pages",
        description: "Read pages",
        parameters: tool.jsonSchema,
      },
    });
  });

  it("reports empty and failed contents results to the model", async () => {
    vi.spyOn(exa, "request").mockResolvedValue({
      requestId: "request-1",
      results: [],
    });
    const tool = exa.tools.getContents();
    expect(await tool.run({ urls: ["https://example.com"] })).toBe(
      "No contents found."
    );
    expect(await tool.run({ urls: "https://example.com" })).toMatch(/^Error:/);
  });

  it("serializes contents tools for every provider and handler", async () => {
    vi.spyOn(exa, "request").mockResolvedValue({
      requestId: "request-1",
      results: [
        {
          id: "result-1",
          title: "Example",
          url: "https://example.com",
          text: "Page text",
        },
      ],
    });
    const search = exa.openai.webSearch();
    const contents = exa.openai.getContents();
    const responsesTool = exa.openai.responses.getContents();
    const anthropicTool = exa.anthropic.getContents();

    expect(JSON.parse(JSON.stringify(responsesTool))).toEqual({
      type: "function",
      name: "get_contents",
      description: responsesTool.description,
      parameters: responsesTool.jsonSchema,
      strict: false,
    });
    expect(JSON.parse(JSON.stringify(anthropicTool))).toEqual({
      name: "get_contents",
      description: anthropicTool.description,
      input_schema: anthropicTool.jsonSchema,
    });

    const chatMessages = await exa.openai.handleToolCalls({
      tool_calls: [
        {
          id: "call-1",
          function: { name: search.name, arguments: '{"query":"q"}' },
        },
        {
          id: "call-2",
          function: {
            name: contents.name,
            arguments: '{"urls":["https://example.com"]}',
          },
        },
      ],
    });
    expect(chatMessages).toHaveLength(2);
    expect((chatMessages[1] as { content: string }).content).toContain(
      "Text: Page text"
    );

    const responsesOutputs = await exa.openai.responses.handleToolCalls([
      {
        type: "function_call",
        call_id: "call-3",
        name: responsesTool.name,
        arguments: '{"urls":["https://example.com"]}',
      },
    ]);
    expect(responsesOutputs[0].output).toContain("Text: Page text");

    const toolResults = await exa.anthropic.handleToolUse({
      content: [
        {
          type: "tool_use",
          id: "toolu-1",
          name: anthropicTool.name,
          input: { urls: ["https://example.com"] },
        },
      ],
    });
    expect(toolResults[0].content).toContain("Text: Page text");
  });
});
