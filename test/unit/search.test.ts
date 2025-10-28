import { beforeEach, describe, expect, it, vi } from "vitest";
import Exa from "../../src";

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
});
