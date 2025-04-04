import { describe, expect, it, vi, beforeEach } from "vitest";
import Exa, { WebsetStatus, WebsetSearchStatus, WebsetEnrichmentFormat } from "../src";

// Mock fetch implementation
global.fetch = vi.fn();

describe("Websets API", () => {
  let exa: Exa;

  beforeEach(() => {
    vi.resetAllMocks();
    exa = new Exa("test-api-key", "https://api.exa.ai");
  });

  it("should create a new Webset", async () => {
    const mockResponse = {
      id: "ws_123456",
      object: "webset",
      status: "running",
      searches: [],
      enrichments: [],
      createdAt: "2023-01-01T00:00:00Z",
      updatedAt: "2023-01-01T00:00:00Z"
    };

    // @ts-ignore - Mocking fetch
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await exa.websets.create({
      search: {
        query: "Test query",
        count: 10
      }
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.exa.ai/websets/v0/websets",
      expect.objectContaining({
        method: "POST",
        body: expect.any(String),
      })
    );
    expect(result).toEqual(mockResponse);
  });

  it("should get a Webset by ID", async () => {
    const mockResponse = {
      id: "ws_123456",
      object: "webset",
      status: "idle",
      searches: [],
      enrichments: [],
      createdAt: "2023-01-01T00:00:00Z",
      updatedAt: "2023-01-01T00:00:00Z"
    };

    // @ts-ignore - Mocking fetch
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await exa.websets.get("ws_123456");

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.exa.ai/websets/v0/websets/ws_123456",
      expect.objectContaining({
        method: "GET",
      })
    );
    expect(result).toEqual(mockResponse);
  });

  it("should list Websets", async () => {
    const mockResponse = {
      data: [
        {
          id: "ws_123456",
          object: "webset",
          status: "idle",
          searches: [],
          enrichments: [],
          createdAt: "2023-01-01T00:00:00Z",
          updatedAt: "2023-01-01T00:00:00Z"
        }
      ],
      hasMore: false,
      nextCursor: null
    };

    // @ts-ignore - Mocking fetch
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await exa.websets.list();

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.exa.ai/websets/v0/websets",
      expect.objectContaining({
        method: "GET",
      })
    );
    expect(result).toEqual(mockResponse);
  });

  it("should update a Webset", async () => {
    const mockResponse = {
      id: "ws_123456",
      object: "webset",
      status: "idle",
      searches: [],
      enrichments: [],
      metadata: { updated: true },
      createdAt: "2023-01-01T00:00:00Z",
      updatedAt: "2023-01-01T00:00:00Z"
    };

    // @ts-ignore - Mocking fetch
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await exa.websets.update("ws_123456", {
      metadata: { updated: true }
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.exa.ai/websets/v0/websets/ws_123456",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("metadata"),
      })
    );
    expect(result).toEqual(mockResponse);
  });

  it("should delete a Webset", async () => {
    const mockResponse = {
      id: "ws_123456",
      object: "webset",
      status: "idle",
      searches: [],
      enrichments: [],
      createdAt: "2023-01-01T00:00:00Z",
      updatedAt: "2023-01-01T00:00:00Z"
    };

    // @ts-ignore - Mocking fetch
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await exa.websets.delete("ws_123456");

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.exa.ai/websets/v0/websets/ws_123456",
      expect.objectContaining({
        method: "DELETE",
      })
    );
    expect(result).toEqual(mockResponse);
  });

  it("should create a new search for a Webset", async () => {
    const mockResponse = {
      id: "ws_search_123456",
      object: "webset_search",
      status: "running",
      query: "Test search",
      count: 10,
      criteria: [],
      progress: { found: 0, completion: 0 },
      createdAt: "2023-01-01T00:00:00Z",
      updatedAt: "2023-01-01T00:00:00Z"
    };

    // @ts-ignore - Mocking fetch
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await exa.websets.searches.create("ws_123456", {
      query: "Test search",
      count: 10
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.exa.ai/websets/v0/websets/ws_123456/searches",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("Test search"),
      })
    );
    expect(result).toEqual(mockResponse);
  });

  it("should create an enrichment for a Webset", async () => {
    const mockResponse = {
      id: "ws_enrichment_123456",
      object: "webset_enrichment",
      status: "pending",
      websetId: "ws_123456",
      description: "Test enrichment",
      format: "text",
      createdAt: "2023-01-01T00:00:00Z",
      updatedAt: "2023-01-01T00:00:00Z"
    };

    // @ts-ignore - Mocking fetch
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await exa.websets.enrichments.create("ws_123456", {
      description: "Test enrichment",
      format: WebsetEnrichmentFormat.TEXT
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.exa.ai/websets/v0/websets/ws_123456/enrichments",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("Test enrichment"),
      })
    );
    expect(result).toEqual(mockResponse);
  });

  it("should list items in a Webset", async () => {
    const mockResponse = {
      data: [
        {
          id: "ws_item_123456",
          object: "webset_item",
          source: "search",
          sourceId: "ws_search_123456",
          websetId: "ws_123456",
          properties: {
            type: "company",
            url: "https://example.com",
            description: "Example company",
            company: {
              name: "Example Inc."
            }
          },
          evaluations: [],
          createdAt: "2023-01-01T00:00:00Z",
          updatedAt: "2023-01-01T00:00:00Z"
        }
      ],
      hasMore: false,
      nextCursor: null
    };

    // @ts-ignore - Mocking fetch
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await exa.websets.items.list("ws_123456");

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.exa.ai/websets/v0/websets/ws_123456/items",
      expect.objectContaining({
        method: "GET",
      })
    );
    expect(result).toEqual(mockResponse);
  });

  it("should wait until a Webset is idle", async () => {
    // First response: running
    const mockRunningResponse = {
      id: "ws_123456",
      object: "webset",
      status: WebsetStatus.RUNNING,
      searches: [],
      enrichments: [],
      createdAt: "2023-01-01T00:00:00Z",
      updatedAt: "2023-01-01T00:00:00Z"
    };

    // Second response: idle
    const mockIdleResponse = {
      id: "ws_123456",
      object: "webset",
      status: WebsetStatus.IDLE,
      searches: [],
      enrichments: [],
      createdAt: "2023-01-01T00:00:00Z",
      updatedAt: "2023-01-01T00:00:00Z"
    };

    // @ts-ignore - Mocking fetch - first call returns running, second returns idle
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockRunningResponse,
    }).mockResolvedValueOnce({
      ok: true,
      json: async () => mockIdleResponse,
    });

    // Mock setTimeout to avoid waiting in tests
    vi.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
      callback();
      return {} as any;
    });

    const result = await exa.websets.waitUntilIdle("ws_123456");

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(result).toEqual(mockIdleResponse);
    expect(result.status).toBe(WebsetStatus.IDLE);
  });
});