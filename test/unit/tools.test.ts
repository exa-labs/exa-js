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

    const tool = exa.tools.search();
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
    const openaiTool = exa.openai.search();
    const responsesTool = exa.openai.responses.search();
    const anthropicTool = exa.anthropic.search();

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

    const tool = exa.openai.search({
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
    expect(exa.openai.responses.search({}).definition).toEqual({
      type: "function",
      name: "web_search",
      description: expect.any(String),
      parameters: expect.any(Object),
      strict: false,
    });
  });

  it("handles malformed arguments and unknown tools without throwing", async () => {
    const tool = exa.openai.search();
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

    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      role: "tool",
      tool_call_id: "call-1",
    });
    expect((messages[0] as { content: string }).content).toMatch(/^Error:/);
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
    const search = exa.openai.search();

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
    const first = exa.openai.search({ type: "neural" });
    const second = exa.openai.search({ type: "keyword" });

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
    const search = exa.anthropic.search();
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
    expect(anthropicResults).toHaveLength(1);
    expect(anthropicResults[0].type).toBe("tool_result");

    const responseTool = exa.openai.responses.search();
    const responseResults = await exa.openai.responses.handleToolCalls([
      {
        type: "function_call",
        call_id: "call-1",
        name: responseTool.name,
        arguments: '{"query":"news"}',
      },
    ]);
    const unifiedResults = await exa.openai.handleToolCalls([
      {
        type: "function_call",
        call_id: "call-1",
        name: responseTool.name,
        arguments: '{"query":"news"}',
      },
    ]);
    expect(responseResults).toBeDefined();
    expect(unifiedResults).toEqual(responseResults);
  });
});
