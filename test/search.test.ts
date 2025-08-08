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
      type: "auto",
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
      type: "auto",
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
      type: "auto",
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
      type: "auto",
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
      type: "auto",
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
      type: "auto",
    });
    expect(result).toEqual(mockResponse);
  });

  it("should handle fast search type", async () => {
    const mockResponse = {
      results: [
        {
          title: "Fast Search Result",
          url: "https://example.com",
          id: "fast-id",
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
    });
    expect(result).toEqual(mockResponse);
  });

  it("should handle userLocation parameter", async () => {
    const mockResponse = {
      results: [
        {
          title: "US Result",
          url: "https://example.com",
          id: "us-id",
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
      type: "auto",
    });
    expect(result).toEqual(mockResponse);
  });
}); 