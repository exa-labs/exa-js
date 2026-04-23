import { beforeEach, describe, expect, it, vi } from "vitest";
import Exa, { type SearchStreamChunk } from "../../src";

function createSseResponse(lines: string[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const line of lines) {
        controller.enqueue(encoder.encode(`${line}\n`));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: { "content-type": "text/event-stream" },
  });
}

/**
 * Test suite for search endpoints.
 *
 * These tests only ensure that the Exa client constructs the correct
 * internal request payload. They do **not** make any real HTTP calls.
 */

describe("Search API", () => {
  let exa: Exa;

  beforeEach(() => {
    vi.resetAllMocks();
    exa = new Exa("test-api-key", "https://api.exa.ai");
  });

  it("should perform basic search with default text contents", async () => {
    const mockResponse = {
      results: [
        {
          title: "Test Result",
          url: "https://example.com",
          id: "test-id",
          text: "Default text content",
        },
      ],
      requestId: "req-123",
    };

    const requestSpy = vi
      .spyOn(exa, "request")
      .mockResolvedValueOnce(mockResponse);

    const result = await exa.search("latest AI developments", {
      numResults: 2,
    });

    expect(requestSpy).toHaveBeenCalledWith("/search", "POST", {
      query: "latest AI developments",
      numResults: 2,
      contents: {
        text: {
          maxCharacters: 10000,
        },
      },
    });
    expect(result).toEqual(mockResponse);
  });

  it("should perform searchAndContents with text option", async () => {
    const mockResponse = {
      results: [
        {
          title: "Test Result",
          url: "https://example.com",
          id: "test-id",
          text: "Sample text content",
        },
      ],
      requestId: "req-123",
    };

    const requestSpy = vi
      .spyOn(exa, "request")
      .mockResolvedValueOnce(mockResponse);

    const result = await exa.searchAndContents("latest AI developments", {
      text: true,
      numResults: 2,
    });

    expect(requestSpy).toHaveBeenCalledWith("/search", "POST", {
      query: "latest AI developments",
      contents: {
        text: true,
      },
      numResults: 2,
    });
    expect(result).toEqual(mockResponse);
  });

  it("should properly nest context option under contents", async () => {
    const mockResponse = {
      results: [
        {
          title: "Test Result",
          url: "https://example.com",
          id: "test-id",
          text: "Sample text content",
        },
      ],
      context: "This is the context string",
      requestId: "req-123",
    };

    const requestSpy = vi
      .spyOn(exa, "request")
      .mockResolvedValueOnce(mockResponse);

    const result = await exa.searchAndContents("latest AI developments", {
      text: true,
      context: true,
      numResults: 2,
    });

    expect(requestSpy).toHaveBeenCalledWith("/search", "POST", {
      query: "latest AI developments",
      contents: {
        text: true,
        context: true,
      },
      numResults: 2,
    });
    expect(result).toEqual(mockResponse);
  });

  it("should handle multiple content options correctly", async () => {
    const mockResponse = {
      results: [
        {
          title: "Test Result",
          url: "https://example.com",
          id: "test-id",
          text: "Sample text content",
          summary: "This is a summary",
        },
      ],
      requestId: "req-123",
    };

    const requestSpy = vi
      .spyOn(exa, "request")
      .mockResolvedValueOnce(mockResponse);

    const result = await exa.searchAndContents("latest AI developments", {
      text: { maxCharacters: 1000 },
      summary: { query: "Summarize this" },
      context: { maxCharacters: 500 },
      numResults: 3,
    });

    expect(requestSpy).toHaveBeenCalledWith("/search", "POST", {
      query: "latest AI developments",
      contents: {
        text: { maxCharacters: 1000 },
        summary: { query: "Summarize this" },
        context: { maxCharacters: 500 },
      },
      numResults: 3,
    });
    expect(result).toEqual(mockResponse);
  });

  it("should handle highlights option with searchAndContents", async () => {
    const mockResponse = {
      results: [
        {
          title: "Test Result",
          url: "https://example.com",
          id: "test-id",
          highlights: ["highlight 1", "highlight 2"],
          highlightScores: [0.9, 0.8],
        },
      ],
      requestId: "req-123",
    };

    const requestSpy = vi
      .spyOn(exa, "request")
      .mockResolvedValueOnce(mockResponse);

    const result = await exa.searchAndContents("latest AI developments", {
      highlights: true,
      numResults: 2,
    });

    expect(requestSpy).toHaveBeenCalledWith("/search", "POST", {
      query: "latest AI developments",
      contents: {
        highlights: true,
      },
      numResults: 2,
    });
    expect(result).toEqual(mockResponse);
  });

  it("should handle highlights with detailed options", async () => {
    const mockResponse = {
      results: [
        {
          title: "Test Result",
          url: "https://example.com",
          id: "test-id",
          highlights: ["highlight 1", "highlight 2"],
          highlightScores: [0.9, 0.8],
        },
      ],
      requestId: "req-123",
    };

    const requestSpy = vi
      .spyOn(exa, "request")
      .mockResolvedValueOnce(mockResponse);

    const result = await exa.searchAndContents("latest AI developments", {
      highlights: { numSentences: 2, highlightsPerUrl: 3, query: "key points" },
      numResults: 2,
    });

    expect(requestSpy).toHaveBeenCalledWith("/search", "POST", {
      query: "latest AI developments",
      contents: {
        highlights: {
          numSentences: 2,
          highlightsPerUrl: 3,
          query: "key points",
        },
      },
      numResults: 2,
    });
    expect(result).toEqual(mockResponse);
  });

  it("should handle highlights with maxCharacters option", async () => {
    const mockResponse = {
      results: [
        {
          title: "Test Result",
          url: "https://example.com",
          id: "test-id",
          highlights: ["highlight 1", "highlight 2"],
          highlightScores: [0.9, 0.8],
        },
      ],
      requestId: "req-123",
    };

    const requestSpy = vi
      .spyOn(exa, "request")
      .mockResolvedValueOnce(mockResponse);

    const result = await exa.searchAndContents("latest AI developments", {
      highlights: { maxCharacters: 200, query: "key points" },
      numResults: 2,
    });

    expect(requestSpy).toHaveBeenCalledWith("/search", "POST", {
      query: "latest AI developments",
      contents: {
        highlights: { maxCharacters: 200, query: "key points" },
      },
      numResults: 2,
    });
    expect(result).toEqual(mockResponse);
  });
  it("should handle text and highlights together", async () => {
    const mockResponse = {
      results: [
        {
          title: "Test Result",
          url: "https://example.com",
          id: "test-id",
          text: "Sample text content",
          highlights: ["highlight 1", "highlight 2"],
          highlightScores: [0.9, 0.8],
        },
      ],
      requestId: "req-123",
    };

    const requestSpy = vi
      .spyOn(exa, "request")
      .mockResolvedValueOnce(mockResponse);

    const result = await exa.searchAndContents("latest AI developments", {
      text: true,
      highlights: true,
      numResults: 2,
    });

    expect(requestSpy).toHaveBeenCalledWith("/search", "POST", {
      query: "latest AI developments",
      contents: {
        text: true,
        highlights: true,
      },
      numResults: 2,
    });
    expect(result).toEqual(mockResponse);
  });

  it("should handle fullText with searchAndContents", async () => {
    const mockResponse = {
      results: [
        {
          title: "Test Result",
          url: "https://example.com",
          id: "test-id",
          fullText: "Full page text content",
        },
      ],
      requestId: "req-123",
    };

    const requestSpy = vi
      .spyOn(exa, "request")
      .mockResolvedValueOnce(mockResponse);

    const result = await exa.searchAndContents("latest AI developments", {
      fullText: { maxCharacters: 1000 },
      numResults: 2,
    });

    expect(requestSpy).toHaveBeenCalledWith("/search", "POST", {
      query: "latest AI developments",
      contents: {
        fullText: { maxCharacters: 1000 },
      },
      numResults: 2,
    });
    expect(result).toEqual(mockResponse);
  });

  it("should handle highlights via search contents option", async () => {
    const mockResponse = {
      results: [
        {
          title: "Test Result",
          url: "https://example.com",
          id: "test-id",
          highlights: ["highlight 1"],
          highlightScores: [0.95],
        },
      ],
      requestId: "req-123",
    };

    const requestSpy = vi
      .spyOn(exa, "request")
      .mockResolvedValueOnce(mockResponse);

    const result = await exa.search("test query", {
      contents: { highlights: { numSentences: 2 } },
    });

    expect(requestSpy).toHaveBeenCalledWith("/search", "POST", {
      query: "test query",
      contents: { highlights: { numSentences: 2 } },
    });
    expect(result).toEqual(mockResponse);
  });

  it("should pass fullText through getContents", async () => {
    const mockResponse = {
      results: [
        {
          title: "Test Result",
          url: "https://example.com",
          id: "test-id",
          fullText: "Full page text content",
        },
      ],
      requestId: "req-123",
    };

    const requestSpy = vi
      .spyOn(exa, "request")
      .mockResolvedValueOnce(mockResponse);

    const result = await exa.getContents(["https://example.com"], {
      fullText: { maxCharacters: 1000 },
    });

    expect(requestSpy).toHaveBeenCalledWith("/contents", "POST", {
      urls: ["https://example.com"],
      fullText: { maxCharacters: 1000 },
    });
    expect(result).toEqual(mockResponse);
  });

  it("should default to text with maxCharacters when no content options provided", async () => {
    const mockResponse = {
      results: [
        {
          title: "Test Result",
          url: "https://example.com",
          id: "test-id",
          text: "Default text content",
        },
      ],
      requestId: "req-123",
    };

    const requestSpy = vi
      .spyOn(exa, "request")
      .mockResolvedValueOnce(mockResponse);

    const result = await exa.searchAndContents("test query");

    expect(requestSpy).toHaveBeenCalledWith("/search", "POST", {
      query: "test query",
      contents: {
        text: {
          maxCharacters: 10000,
        },
      },
    });
    expect(result).toEqual(mockResponse);
  });

  it("should handle findSimilarAndContents with context", async () => {
    const mockResponse = {
      results: [
        {
          title: "Similar Result",
          url: "https://similar.com",
          id: "similar-id",
          text: "Similar content",
        },
      ],
      context: "Context for similar results",
      requestId: "req-456",
    };

    const requestSpy = vi
      .spyOn(exa, "request")
      .mockResolvedValueOnce(mockResponse);

    const result = await exa.findSimilarAndContents("https://example.com", {
      text: true,
      context: true,
      numResults: 5,
    });

    expect(requestSpy).toHaveBeenCalledWith("/findSimilar", "POST", {
      url: "https://example.com",
      contents: {
        text: true,
        context: true,
      },
      numResults: 5,
    });
    expect(result).toEqual(mockResponse);
  });

  it("should handle livecrawl preferred option in contents", async () => {
    const mockResponse = {
      results: [
        {
          title: "Test Result",
          url: "https://example.com",
          id: "test-id",
          text: "Livecrawled content",
        },
      ],
      requestId: "req-789",
    };

    const requestSpy = vi
      .spyOn(exa, "request")
      .mockResolvedValueOnce(mockResponse);

    const result = await exa.searchAndContents("latest AI developments", {
      text: true,
      livecrawl: "preferred",
      livecrawlTimeout: 8000,
      numResults: 3,
    });

    expect(requestSpy).toHaveBeenCalledWith("/search", "POST", {
      query: "latest AI developments",
      contents: {
        text: true,
        livecrawl: "preferred",
        livecrawlTimeout: 8000,
      },
      numResults: 3,
    });
    expect(result).toEqual(mockResponse);
  });

  it("should handle fast search type with default text contents", async () => {
    const mockResponse = {
      results: [
        {
          title: "Fast Search Result",
          url: "https://example.com",
          id: "fast-id",
          text: "Fast search text content",
        },
      ],
      requestId: "req-fast-123",
    };

    const requestSpy = vi
      .spyOn(exa, "request")
      .mockResolvedValueOnce(mockResponse);

    const result = await exa.search("quick search query", {
      type: "fast",
      numResults: 10,
    });

    expect(requestSpy).toHaveBeenCalledWith("/search", "POST", {
      query: "quick search query",
      type: "fast",
      numResults: 10,
      contents: {
        text: {
          maxCharacters: 10000,
        },
      },
    });
    expect(result).toEqual(mockResponse);
  });

  it("should handle instant search type with default text contents", async () => {
    const mockResponse = {
      results: [
        {
          title: "Instant Search Result",
          url: "https://example.com",
          id: "instant-id",
          text: "Instant search text content",
        },
      ],
      requestId: "req-instant-123",
    };

    const requestSpy = vi
      .spyOn(exa, "request")
      .mockResolvedValueOnce(mockResponse);

    const result = await exa.search("instant search query", {
      type: "instant",
      numResults: 10,
    });

    expect(requestSpy).toHaveBeenCalledWith("/search", "POST", {
      query: "instant search query",
      type: "instant",
      numResults: 10,
      contents: {
        text: {
          maxCharacters: 10000,
        },
      },
    });
    expect(result).toEqual(mockResponse);
  });

  it("should handle userLocation parameter with default text contents", async () => {
    const mockResponse = {
      results: [
        {
          title: "US Result",
          url: "https://example.com",
          id: "us-id",
          text: "US local news content",
        },
      ],
      requestId: "req-us-123",
    };

    const requestSpy = vi
      .spyOn(exa, "request")
      .mockResolvedValueOnce(mockResponse);

    const result = await exa.search("local news", {
      userLocation: "US",
      numResults: 5,
    });

    expect(requestSpy).toHaveBeenCalledWith("/search", "POST", {
      query: "local news",
      userLocation: "US",
      numResults: 5,
      contents: {
        text: {
          maxCharacters: 10000,
        },
      },
    });
    expect(result).toEqual(mockResponse);
  });

  it("should allow opting out of contents with contents: false", async () => {
    const mockResponse = {
      results: [
        {
          title: "Result Without Contents",
          url: "https://example.com",
          id: "no-contents-id",
        },
      ],
      requestId: "req-no-contents-123",
    };

    const requestSpy = vi
      .spyOn(exa, "request")
      .mockResolvedValueOnce(mockResponse);

    const result = await exa.search("test query", {
      contents: false,
      numResults: 5,
    });

    expect(requestSpy).toHaveBeenCalledWith("/search", "POST", {
      query: "test query",
      numResults: 5,
      // Note: contents field should NOT be present when set to false
    });
    expect(result).toEqual(mockResponse);
  });

  it("should pass additionalQueries for deep search", async () => {
    const mockResponse = {
      results: [
        {
          title: "Deep Search Result",
          url: "https://example.com",
          id: "deep-search-id",
          text: "Deep search result text",
        },
      ],
      context: "Deep search context string",
      requestId: "req-deep-123",
    };

    const requestSpy = vi
      .spyOn(exa, "request")
      .mockResolvedValueOnce(mockResponse);

    const result = await exa.search("machine learning", {
      type: "deep",
      additionalQueries: ["ML algorithms", "neural networks", "AI models"],
      numResults: 5,
    });

    expect(requestSpy).toHaveBeenCalledWith("/search", "POST", {
      query: "machine learning",
      type: "deep",
      additionalQueries: ["ML algorithms", "neural networks", "AI models"],
      numResults: 5,
      contents: {
        text: {
          maxCharacters: 10000,
        },
      },
    });
    expect(result).toEqual(mockResponse);
    expect(result.context).toBeDefined();
  });

  it("should pass outputSchema for deep search", async () => {
    const mockResponse = {
      results: [
        {
          title: "Deep Structured Result",
          url: "https://example.com/structured",
          id: "deep-structured-id",
          text: "Deep structured result text",
        },
      ],
      output: {
        content: { company: "Exa", founded: 2021 },
        grounding: [
          {
            field: "company",
            citations: [
              { url: "https://example.com/structured", title: "Deep Structured Result" },
            ],
            confidence: "high",
          },
        ],
      },
      requestId: "req-deep-structured-123",
    };

    const requestSpy = vi
      .spyOn(exa, "request")
      .mockResolvedValueOnce(mockResponse);

    const result = await exa.search("exa company profile", {
      type: "deep",
      outputSchema: {
        type: "object",
        properties: {
          company: { type: "string" },
          founded: { type: "number" },
        },
        required: ["company", "founded"],
      },
      numResults: 5,
    });

    expect(requestSpy).toHaveBeenCalledWith("/search", "POST", {
      query: "exa company profile",
      type: "deep",
      outputSchema: {
        type: "object",
        properties: {
          company: { type: "string" },
          founded: { type: "number" },
        },
        required: ["company", "founded"],
      },
      numResults: 5,
      contents: {
        text: {
          maxCharacters: 10000,
        },
      },
    });
    expect(result).toEqual(mockResponse);
    expect(result.output).toEqual({
      content: { company: "Exa", founded: 2021 },
      grounding: [
        {
          field: "company",
          citations: [{ url: "https://example.com/structured", title: "Deep Structured Result" }],
          confidence: "high",
        },
      ],
    });
  });

  it("should pass outputSchema for fast search", async () => {
    const mockResponse = {
      results: [
        {
          title: "Fast Structured Result",
          url: "https://example.com/fast-structured",
          id: "fast-structured-id",
          text: "Fast structured result text",
        },
      ],
      output: {
        content: { summary: "Fast search synthesis" },
        grounding: [
          {
            field: "summary",
            citations: [
              { url: "https://example.com/fast-structured", title: "Fast Structured Result" },
            ],
            confidence: "high",
          },
        ],
      },
      requestId: "req-fast-structured-123",
    };

    const requestSpy = vi
      .spyOn(exa, "request")
      .mockResolvedValueOnce(mockResponse);

    const result = await exa.search("exa company profile", {
      type: "fast",
      outputSchema: {
        type: "object",
        properties: {
          summary: { type: "string" },
        },
        required: ["summary"],
      },
      numResults: 5,
    });

    expect(requestSpy).toHaveBeenCalledWith("/search", "POST", {
      query: "exa company profile",
      type: "fast",
      outputSchema: {
        type: "object",
        properties: {
          summary: { type: "string" },
        },
        required: ["summary"],
      },
      numResults: 5,
      contents: {
        text: {
          maxCharacters: 10000,
        },
      },
    });
    expect(result).toEqual(mockResponse);
    expect(result.output).toEqual({
      content: { summary: "Fast search synthesis" },
      grounding: [
        {
          field: "summary",
          citations: [{ url: "https://example.com/fast-structured", title: "Fast Structured Result" }],
          confidence: "high",
        },
      ],
    });
  });

  it("should pass systemPrompt for deep search", async () => {
    const mockResponse = {
      results: [
        {
          title: "Deep Search Result",
          url: "https://example.com/deep-system-prompt",
          id: "deep-system-prompt-id",
          text: "Deep search result text",
        },
      ],
      requestId: "req-deep-system-prompt-123",
    };

    const requestSpy = vi.spyOn(exa, "request").mockResolvedValueOnce(mockResponse);

    const result = await exa.search("compare recent model launches", {
      type: "deep-reasoning",
      systemPrompt: "Prefer official sources and avoid duplicate results",
      numResults: 5,
    });

    expect(requestSpy).toHaveBeenCalledWith("/search", "POST", {
      query: "compare recent model launches",
      type: "deep-reasoning",
      systemPrompt: "Prefer official sources and avoid duplicate results",
      numResults: 5,
      contents: {
        text: {
          maxCharacters: 10000,
        },
      },
    });
    expect(result).toEqual(mockResponse);
  });

  it("should pass systemPrompt for auto search", async () => {
    const mockResponse = {
      results: [
        {
          title: "Auto Search Result",
          url: "https://example.com/auto-system-prompt",
          id: "auto-system-prompt-id",
          text: "Auto search result text",
        },
      ],
      requestId: "req-auto-system-prompt-123",
    };

    const requestSpy = vi.spyOn(exa, "request").mockResolvedValueOnce(mockResponse);

    const result = await exa.search("compare recent model launches", {
      type: "auto",
      systemPrompt: "Prefer official sources and avoid duplicate results",
      numResults: 5,
    });

    expect(requestSpy).toHaveBeenCalledWith("/search", "POST", {
      query: "compare recent model launches",
      type: "auto",
      systemPrompt: "Prefer official sources and avoid duplicate results",
      numResults: 5,
      contents: {
        text: {
          maxCharacters: 10000,
        },
      },
    });
    expect(result).toEqual(mockResponse);
  });

  it("should reject search with stream and direct callers to streamSearch", async () => {
    await expect(
      exa.search("compare recent model launches", {
        type: "auto",
        stream: true,
      })
    ).rejects.toThrow(/streamSearch/);
  });

  it("should stream search results as OpenAI-style chat completion chunks", async () => {
    const rawRequestSpy = vi.spyOn(exa, "rawRequest").mockResolvedValueOnce(
      createSseResponse([
        'data: {"choices":[{"delta":{"content":"Hello"}}]}',
        'data: {"citations":[{"id":"1","url":"https://example.com","title":"Example"}]}',
      ])
    );

    const chunks: SearchStreamChunk[] = [];
    for await (const chunk of exa.streamSearch("compare recent model launches", {
      type: "auto",
      systemPrompt: "Prefer official sources",
      outputSchema: {
        type: "text",
        description: "Short answer",
      },
    })) {
      chunks.push(chunk);
    }

    expect(rawRequestSpy).toHaveBeenCalledWith("/search", "POST", {
      query: "compare recent model launches",
      type: "auto",
      systemPrompt: "Prefer official sources",
      outputSchema: {
        type: "text",
        description: "Short answer",
      },
      contents: {
        text: {
          maxCharacters: 10000,
        },
      },
      stream: true,
    });
    expect(chunks).toEqual([
      { content: "Hello", citations: undefined },
      {
        content: undefined,
        citations: [
          {
            id: "1",
            url: "https://example.com",
            title: "Example",
            publishedDate: undefined,
            author: undefined,
            text: undefined,
          },
        ],
      },
    ]);
  });

  it("should pass additionalQueries for deep-reasoning search type", async () => {
    const mockResponse = {
      results: [
        {
          title: "Deep Search Result",
          url: "https://example.com",
          id: "deep-search-id",
          text: "Deep search result text",
        },
      ],
      context: "Deep search context string",
      requestId: "req-deep-variant-123",
    };

    const requestSpy = vi.spyOn(exa, "request").mockResolvedValueOnce(mockResponse);

    const result = await exa.search("machine learning", {
      type: "deep-reasoning",
      additionalQueries: ["ML algorithms", "neural networks", "AI models"],
      numResults: 5,
    });

    expect(requestSpy).toHaveBeenCalledWith("/search", "POST", {
      query: "machine learning",
      type: "deep-reasoning",
      additionalQueries: ["ML algorithms", "neural networks", "AI models"],
      numResults: 5,
      contents: {
        text: {
          maxCharacters: 10000,
        },
      },
    });
    expect(result).toEqual(mockResponse);
    expect(result.context).toBeDefined();
  });

  it("should pass additionalQueries for deep-lite search type", async () => {
    const mockResponse = {
      results: [
        {
          title: "Deep Lite Search Result",
          url: "https://example.com",
          id: "deep-lite-search-id",
          text: "Deep lite search result text",
        },
      ],
      context: "Deep lite search context string",
      requestId: "req-deep-lite-123",
    };

    const requestSpy = vi.spyOn(exa, "request").mockResolvedValueOnce(mockResponse);

    const result = await exa.search("machine learning", {
      type: "deep-lite",
      additionalQueries: ["ML algorithms", "neural networks", "AI models"],
      numResults: 5,
    });

    expect(requestSpy).toHaveBeenCalledWith("/search", "POST", {
      query: "machine learning",
      type: "deep-lite",
      additionalQueries: ["ML algorithms", "neural networks", "AI models"],
      numResults: 5,
      contents: {
        text: {
          maxCharacters: 10000,
        },
      },
    });
    expect(result).toEqual(mockResponse);
    expect(result.context).toBeDefined();
  });

  it("should pass deep highlights maxCharacters options through contents", async () => {
    const mockResponse = {
      results: [
        {
          title: "Deep Highlights Result",
          url: "https://example.com/deep-highlights",
          id: "deep-highlights-id",
          highlights: ["highlight 1", "highlight 2"],
          highlightScores: [0.91, 0.83],
        },
      ],
      requestId: "req-deep-highlights-123",
    };

    const requestSpy = vi.spyOn(exa, "request").mockResolvedValueOnce(mockResponse);

    const result = await exa.search("latest battery breakthroughs", {
      type: "deep",
      contents: {
        highlights: {
          query: "battery breakthroughs",
          maxCharacters: 1200,
        },
      },
    });

    expect(requestSpy).toHaveBeenCalledWith("/search", "POST", {
      query: "latest battery breakthroughs",
      type: "deep",
      contents: {
        highlights: {
          query: "battery breakthroughs",
          maxCharacters: 1200,
        },
      },
    });
    expect(result).toEqual(mockResponse);
  });
});
