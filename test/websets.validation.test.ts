import { describe, expect, it, vi } from "vitest";
import { Exa } from "../src";
import { 
  CreateWebsetParameters, 
  WebsetStatus, 
  WebsetEnrichmentFormat,
  QueryParams,
  WebsetSearchStatus,
  WebsetsClient,
  WebsetItemsClient,
  WebsetSearchesClient,
  WebsetEnrichmentsClient,
  WebsetWebhooksClient
} from "../src/websets";

// These tests don't make actual API calls - they just validate that the TypeScript types work correctly
describe("Websets API Type Validation", () => {
  // Create a mock Exa client with a mocked request method
  const mockExa = {
    request: (endpoint: string, method: string, data?: any, params?: any) => {
      return Promise.resolve({ success: true });
    }
  } as unknown as Exa;

  const websets = new WebsetsClient(mockExa);

  it("should have properly typed client instances", () => {
    expect(websets.items).toBeInstanceOf(WebsetItemsClient);
    expect(websets.searches).toBeInstanceOf(WebsetSearchesClient);
    expect(websets.enrichments).toBeInstanceOf(WebsetEnrichmentsClient);
    expect(websets.webhooks).toBeInstanceOf(WebsetWebhooksClient);
  });

  it("should handle create parameters correctly", async () => {
    const params: CreateWebsetParameters = {
      search: {
        query: "Test query",
        count: 10,
        entity: {
          type: "company"
        }
      },
      metadata: {
        test: "value"
      }
    };

    // We're not testing the actual API call, just that the types match correctly
    const spyCreate = vi.spyOn(websets, 'create');
    await websets.create(params);
    
    expect(spyCreate).toHaveBeenCalledWith(params);
  });

  it("should handle query parameters correctly", async () => {
    const queryParams: QueryParams = {
      cursor: "test-cursor",
      limit: 10,
      expand: ["items"]
    };

    // Mock the request to return consistent data
    const spyRequest = vi.spyOn(websets as any, 'request').mockResolvedValue({
      id: "test-id",
      status: WebsetStatus.IDLE,
      items: []
    });

    // Test with explicit params
    await websets.get("test-id", ["items"]);
    expect(spyRequest).toHaveBeenCalledWith(
      "/v0/websets/test-id", 
      "GET", 
      undefined, 
      expect.objectContaining({ expand: ["items"] })
    );
  });

  it("should handle pagination parameters correctly", async () => {
    const spyRequest = vi.spyOn(websets as any, 'request').mockResolvedValue({
      data: [],
      hasMore: false,
      nextCursor: null
    });

    await websets.list("cursor-value", 20);
    expect(spyRequest).toHaveBeenCalledWith(
      "/v0/websets", 
      "GET", 
      undefined, 
      expect.objectContaining({ 
        cursor: "cursor-value",
        limit: 20 
      })
    );
  });

  it("should use correct enum values", () => {
    // Test that enum values match the expected string values
    expect(WebsetStatus.IDLE).toBe("idle");
    expect(WebsetStatus.RUNNING).toBe("running");
    expect(WebsetStatus.PAUSED).toBe("paused");

    expect(WebsetSearchStatus.CREATED).toBe("created");
    expect(WebsetSearchStatus.RUNNING).toBe("running");
    expect(WebsetSearchStatus.COMPLETED).toBe("completed");
    expect(WebsetSearchStatus.CANCELED).toBe("canceled");

    expect(WebsetEnrichmentFormat.TEXT).toBe("text");
    expect(WebsetEnrichmentFormat.DATE).toBe("date");
    expect(WebsetEnrichmentFormat.NUMBER).toBe("number");
    expect(WebsetEnrichmentFormat.OPTIONS).toBe("options");
    expect(WebsetEnrichmentFormat.EMAIL).toBe("email");
    expect(WebsetEnrichmentFormat.PHONE).toBe("phone");
  });

  it("should properly type the waitUntilIdle method", async () => {
    const mockGet = vi.spyOn(websets, 'get').mockImplementation(async () => {
      return {
        id: "test-id",
        object: "webset",
        status: WebsetStatus.IDLE,
        searches: [],
        enrichments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    });

    const result = await websets.waitUntilIdle("test-id", 1000);
    expect(result.status).toBe(WebsetStatus.IDLE);
    expect(mockGet).toHaveBeenCalledWith("test-id");
  });
});