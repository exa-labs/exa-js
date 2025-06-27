import { beforeEach, describe, expect, it, vi } from "vitest";
import Exa from "../src";

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

  it("should perform basic search without contents", async () => {
    const mockResponse = {
      results: [
        {
          title: "Test Result",
          url: "https://example.com",
          id: "test-id",
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
          highlights: ["highlight 1", "highlight 2"],
          highlightScores: [0.9, 0.8],
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
      highlights: { numSentences: 2 },
      summary: { query: "Summarize this" },
      context: { maxCharacters: 500 },
      numResults: 3,
    });

    expect(requestSpy).toHaveBeenCalledWith("/search", "POST", {
      query: "latest AI developments",
      contents: {
        text: { maxCharacters: 1000 },
        highlights: { numSentences: 2 },
        summary: { query: "Summarize this" },
        context: { maxCharacters: 500 },
      },
      numResults: 3,
    });
    expect(result).toEqual(mockResponse);
  });

  it("should default to text: true when no content options provided", async () => {
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
        text: true,
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

  it("should handle includeUrls and excludeUrls filtering", async () => {
    const mockResponse = {
      results: [
        {
          title: "Test Result",
          url: "https://example.com/article",
          id: "test-id",
        },
      ],
      requestId: "req-url-filter",
    };

    const requestSpy = vi
      .spyOn(exa, "request")
      .mockResolvedValueOnce(mockResponse);

    const result = await exa.search("tech news", {
      includeUrls: ["https://techcrunch.com/startups", "https://arstechnica.com/tech-policy"],
      excludeUrls: ["https://example.com/sports", "https://example.com/entertainment"],
      numResults: 5,
    });

    expect(requestSpy).toHaveBeenCalledWith("/search", "POST", {
      query: "tech news",
      includeUrls: ["https://techcrunch.com/startups", "https://arstechnica.com/tech-policy"],
      excludeUrls: ["https://example.com/sports", "https://example.com/entertainment"],
      numResults: 5,
    });
    expect(result).toEqual(mockResponse);
  });

  it("should handle combined domain and URL filtering", async () => {
    const mockResponse = {
      results: [
        {
          title: "Test Result",
          url: "https://nytimes.com/tech/article",
          id: "test-id",
        },
      ],
      requestId: "req-combined-filter",
    };

    const requestSpy = vi
      .spyOn(exa, "request")
      .mockResolvedValueOnce(mockResponse);

    const result = await exa.search("artificial intelligence", {
      includeDomains: ["nytimes.com", "wsj.com"],
      includeUrls: ["https://techcrunch.com/ai"],
      excludeUrls: ["https://nytimes.com/sports"],
      numResults: 3,
    });

    expect(requestSpy).toHaveBeenCalledWith("/search", "POST", {
      query: "artificial intelligence",
      includeDomains: ["nytimes.com", "wsj.com"],
      includeUrls: ["https://techcrunch.com/ai"],
      excludeUrls: ["https://nytimes.com/sports"],
      numResults: 3,
    });
    expect(result).toEqual(mockResponse);
  });

  it("should handle URL filtering in findSimilar", async () => {
    const mockResponse = {
      results: [
        {
          title: "Similar Result",
          url: "https://similar.com/article",
          id: "similar-id",
        },
      ],
      requestId: "req-similar-url-filter",
    };

    const requestSpy = vi
      .spyOn(exa, "request")
      .mockResolvedValueOnce(mockResponse);

    const result = await exa.findSimilar("https://example.com", {
      includeUrls: ["https://similar.com/tech"],
      excludeUrls: ["https://similar.com/sports"],
      numResults: 4,
    });

    expect(requestSpy).toHaveBeenCalledWith("/findSimilar", "POST", {
      url: "https://example.com",
      includeUrls: ["https://similar.com/tech"],
      excludeUrls: ["https://similar.com/sports"],
      numResults: 4,
    });
    expect(result).toEqual(mockResponse);
  });
}); 