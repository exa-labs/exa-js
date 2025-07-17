import { beforeEach, describe, expect, it, vi } from "vitest";
import { Exa } from "../src";
import {
  CreateWebsetParameters,
  GetWebsetResponse,
  WebsetEnrichmentsClient,
  WebsetItemsClient,
  WebsetsClient,
  WebsetSearchesClient,
  WebsetStatus,
  WebsetWebhooksClient,
} from "../src/websets";
import { getProtectedClient } from "./helpers";

type RequestParams = Record<string, string | string[] | number | undefined>;

describe("Websets Client Method Validation", () => {
  class MockExa implements Partial<Exa> {
    request<T = unknown>(
      endpoint: string,
      method: string,
      data?: Record<string, unknown>,
      params?: RequestParams
    ) {
      return Promise.resolve({ success: true } as T);
    }
  }

  const mockExa = new MockExa();
  const websets = new WebsetsClient(mockExa as Exa);
  const websetsWithAccess = getProtectedClient(websets);
  const originalRequest = websetsWithAccess.request;

  beforeEach(() => {
    websetsWithAccess.request = originalRequest;
  });

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
        entity: { type: "company" },
      },
      metadata: { test: "value" },
    };

    const spyCreate = vi.spyOn(websets, "create");
    await websets.create(params);

    expect(spyCreate).toHaveBeenCalledWith(params);
  });

  it("should handle get parameters correctly", async () => {
    websetsWithAccess.request = vi.fn().mockResolvedValue({
      id: "test-id",
      object: "webset",
      status: WebsetStatus.idle,
      externalId: null,
      searches: [],
      enrichments: [],
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: [],
    });

    // Test with expand parameter
    await websets.get("test-id", ["items"]);
    expect(websetsWithAccess.request).toHaveBeenCalledWith(
      "/v0/websets/test-id",
      "GET",
      undefined,
      { expand: ["items"] }
    );

    // Test without expand parameter
    await websets.get("test-id");
    expect(websetsWithAccess.request).toHaveBeenCalledWith(
      "/v0/websets/test-id",
      "GET",
      undefined,
      {}
    );
  });

  it("should handle list pagination parameters correctly", async () => {
    websetsWithAccess.request = vi.fn().mockResolvedValue({
      data: [],
      hasMore: false,
      nextCursor: null,
    });

    await websets.list({ cursor: "cursor-value", limit: 20 });
    expect(websetsWithAccess.request).toHaveBeenCalledWith(
      "/v0/websets",
      "GET",
      undefined,
      {
        cursor: "cursor-value",
        limit: 20,
      }
    );

    await websets.list();
    expect(websetsWithAccess.request).toHaveBeenCalledWith(
      "/v0/websets",
      "GET",
      undefined,
      {}
    );
  });

  it("should properly type the waitUntilIdle method", async () => {
    const mockWebsetResponse: GetWebsetResponse = {
      id: "test-id",
      object: "webset",
      status: WebsetStatus.idle,
      externalId: null,
      imports: [],
      monitors: [],
      streams: [],
      title: "",
      searches: [],
      enrichments: [],
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const mockGet = vi
      .spyOn(websets, "get")
      .mockResolvedValue(mockWebsetResponse);

    const result = await websets.waitUntilIdle("test-id", { pollInterval: 10 });
    expect(result.status).toBe(WebsetStatus.idle);
    expect(mockGet).toHaveBeenCalledWith("test-id");
  });
});
