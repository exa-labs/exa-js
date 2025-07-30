import { beforeEach, describe, expect, it, vi } from "vitest";
import Exa, { WebsetStatus } from "../src";
import { ExaError } from "../src/errors";
import {
  CreateEnrichmentParametersFormat,
  Event,
  EventType,
  ListEventsResponse,
  ListWebsetItemResponse,
  ListWebsetsResponse,
  PreviewWebsetResponse,
  PreviewWebsetResponseEnrichmentsFormat,
  ScopeSourceType,
  Webset,
  WebsetEnrichment,
  WebsetEnrichmentFormat,
  WebsetEnrichmentStatus,
  WebsetItem,
  WebsetItemSource,
  WebsetSearch,
  WebsetSearchBehavior,
  WebsetSearchCanceledReason,
  WebsetSearchStatus,
} from "../src/websets/openapi";
import { getProtectedClient } from "./helpers";

describe("Websets API", () => {
  let exa: Exa;

  beforeEach(() => {
    vi.resetAllMocks(); // Reset mocks if any were set before
    // Instantiate the real class, we will spy on its methods
    exa = new Exa("test-api-key", "https://api.exa.ai");
  });

  it("should create a new Webset", async () => {
    const mockResponse: Webset = {
      id: "ws_123456",
      object: "webset",
      status: WebsetStatus.running,
      searches: [],
      enrichments: [],
      monitors: [],
      createdAt: "2023-01-01T00:00:00Z",
      updatedAt: "2023-01-01T00:00:00Z",
      externalId: null,
      metadata: {},
      imports: [],
      streams: [],
      title: "Test Webset",
    };

    const websetsClient = getProtectedClient(exa.websets);
    const requestSpy = vi
      .spyOn(websetsClient, "request")
      .mockResolvedValueOnce(mockResponse);

    const createParams = {
      search: {
        query: "Test query",
        count: 10,
      },
    };
    const result = await exa.websets.create(createParams);

    // Verify the internal request method was called correctly
    expect(requestSpy).toHaveBeenCalledWith(
      "/v0/websets",
      "POST",
      createParams,
      undefined,
      undefined
    );
    expect(result).toEqual(mockResponse);
  });

  it("should preview a webset query", async () => {
    const mockResponse: PreviewWebsetResponse = {
      search: {
        entity: {
          type: "company",
        },
        criteria: [
          {
            description: "Companies in the AI industry",
          },
          {
            description: "Founded after 2020",
          },
        ],
      },
      enrichments: [
        {
          description: "Company valuation",
          format: PreviewWebsetResponseEnrichmentsFormat.number,
        },
        {
          description: "Funding stage",
          format: PreviewWebsetResponseEnrichmentsFormat.options,
          options: [
            { label: "Seed" },
            { label: "Series A" },
            { label: "Series B" },
          ],
        },
      ],
    };

    const websetsClient = getProtectedClient(exa.websets);
    const requestSpy = vi
      .spyOn(websetsClient, "request")
      .mockResolvedValueOnce(mockResponse);

    const previewParams = {
      query: "AI companies founded after 2020",
      entity: { type: "company" as const },
    };
    const result = await exa.websets.preview(previewParams);

    expect(requestSpy).toHaveBeenCalledWith(
      "/v0/websets/preview",
      "POST",
      previewParams
    );
    expect(result).toEqual(mockResponse);
    expect(result.search.entity.type).toBe("company");
    expect(result.search.criteria).toHaveLength(2);
    expect(result.enrichments).toHaveLength(2);
    expect(result.enrichments[1].format).toBe(
      PreviewWebsetResponseEnrichmentsFormat.options
    );
  });

  it("should create a Webset with scope parameter", async () => {
    const mockResponse: Webset = {
      id: "ws_789012",
      object: "webset",
      status: WebsetStatus.running,
      searches: [],
      enrichments: [],
      monitors: [],
      createdAt: "2023-01-01T00:00:00Z",
      updatedAt: "2023-01-01T00:00:00Z",
      externalId: null,
      metadata: {},
      imports: [],
      streams: [],
      title: "Scoped Webset",
    };

    const websetsClient = getProtectedClient(exa.websets);
    const requestSpy = vi
      .spyOn(websetsClient, "request")
      .mockResolvedValueOnce(mockResponse);

    const createParams = {
      search: {
        query: "Tech companies",
        count: 10,
        scope: [
          {
            id: "import_123456",
            source: ScopeSourceType.import,
          },
        ],
      },
      metadata: { test: "scoped" },
    };
    const result = await exa.websets.create(createParams);

    expect(requestSpy).toHaveBeenCalledWith(
      "/v0/websets",
      "POST",
      createParams,
      undefined,
      undefined
    );
    expect(result).toEqual(mockResponse);
  });

  it("should get a Webset by ID", async () => {
    const mockResponse: Webset = {
      id: "ws_123456",
      object: "webset",
      status: WebsetStatus.idle,
      searches: [],
      enrichments: [],
      monitors: [],
      createdAt: "2023-01-01T00:00:00Z",
      updatedAt: "2023-01-01T00:00:00Z",
      externalId: null,
      metadata: {},
      imports: [],
      streams: [],
      title: "Test Webset",
    };

    const websetsClient = getProtectedClient(exa.websets);
    const requestSpy = vi
      .spyOn(websetsClient, "request")
      .mockResolvedValueOnce(mockResponse);

    const result = await exa.websets.get("ws_123456");

    expect(requestSpy).toHaveBeenCalledWith(
      "/v0/websets/ws_123456",
      "GET",
      undefined,
      {}
    );
    expect(result).toEqual(mockResponse);
  });

  it("should list Websets", async () => {
    const mockWebsetData: Webset = {
      id: "ws_123456",
      object: "webset",
      status: WebsetStatus.idle,
      searches: [],
      enrichments: [],
      monitors: [],
      imports: [],
      streams: [],
      title: "Test Webset",
      createdAt: "2023-01-01T00:00:00Z",
      updatedAt: "2023-01-01T00:00:00Z",
      externalId: null,
      metadata: {},
    };
    const mockResponse: ListWebsetsResponse = {
      data: [mockWebsetData],
      hasMore: false,
      nextCursor: null,
    };

    const websetsClient = getProtectedClient(exa.websets);
    const requestSpy = vi
      .spyOn(websetsClient, "request")
      .mockResolvedValueOnce(mockResponse);

    const listOptions = { limit: 10 };
    const result = await exa.websets.list(listOptions);

    expect(requestSpy).toHaveBeenCalledWith(
      "/v0/websets",
      "GET",
      undefined,
      listOptions
    );
    expect(result).toEqual(mockResponse);
  });

  it("should update a Webset", async () => {
    const mockResponse: Webset = {
      id: "ws_123456",
      object: "webset",
      status: WebsetStatus.idle,
      searches: [],
      enrichments: [],
      monitors: [],
      imports: [],
      streams: [],
      title: "Test Webset",
      metadata: { updated: "true" },
      createdAt: "2023-01-01T00:00:00Z",
      updatedAt: "2023-01-01T00:00:00Z",
      externalId: null,
    };

    const websetsClient = getProtectedClient(exa.websets);
    const requestSpy = vi
      .spyOn(websetsClient, "request")
      .mockResolvedValueOnce(mockResponse);

    const updateParams = { metadata: { updated: "true" } };
    const result = await exa.websets.update("ws_123456", updateParams);

    expect(requestSpy).toHaveBeenCalledWith(
      "/v0/websets/ws_123456",
      "POST",
      updateParams
    );
    expect(result).toEqual(mockResponse);
  });

  it("should delete a Webset", async () => {
    const mockResponse: Webset = {
      id: "ws_123456",
      object: "webset",
      status: WebsetStatus.idle,
      searches: [],
      enrichments: [],
      monitors: [],
      imports: [],
      streams: [],
      title: "Test Webset",
      createdAt: "2023-01-01T00:00:00Z",
      updatedAt: "2023-01-01T00:00:00Z",
      externalId: null,
      metadata: {},
    };

    const websetsClient = getProtectedClient(exa.websets);
    const requestSpy = vi
      .spyOn(websetsClient, "request")
      .mockResolvedValueOnce(mockResponse);

    const result = await exa.websets.delete("ws_123456");

    expect(requestSpy).toHaveBeenCalledWith("/v0/websets/ws_123456", "DELETE");
    expect(result).toEqual(mockResponse);
  });

  it("should create a new search for a Webset", async () => {
    const mockResponse: WebsetSearch = {
      id: "ws_search_123456",
      object: "webset_search",
      status: WebsetSearchStatus.running,
      query: "Test search",
      count: 10,
      behavior: WebsetSearchBehavior.override,
      criteria: [],
      progress: { found: 0, completion: 0, analyzed: 0, timeLeft: null },
      createdAt: "2023-01-01T00:00:00Z",
      updatedAt: "2023-01-01T00:00:00Z",
      canceledAt: null,
      canceledReason: WebsetSearchCanceledReason.webset_canceled,
      entity: { type: "company" },
      metadata: {},
      exclude: [],
      recall: null,
      scope: [],
    };

    const searchesClient = getProtectedClient(exa.websets.searches);
    const requestSpy = vi
      .spyOn(searchesClient, "request")
      .mockResolvedValueOnce(mockResponse);

    const searchParams = {
      query: "Test search",
      count: 10,
      behavior: WebsetSearchBehavior.override,
    };
    const result = await exa.websets.searches.create("ws_123456", searchParams);

    expect(requestSpy).toHaveBeenCalledWith(
      "/v0/websets/ws_123456/searches",
      "POST",
      searchParams,
      undefined,
      undefined
    );
    expect(result).toEqual(mockResponse);
  });

  it("should create an enrichment for a Webset", async () => {
    const mockResponse: WebsetEnrichment = {
      id: "ws_enrichment_123456",
      object: "webset_enrichment",
      status: WebsetEnrichmentStatus.pending,
      websetId: "ws_123456",
      description: "Test enrichment",
      format: WebsetEnrichmentFormat.text,
      createdAt: "2023-01-01T00:00:00Z",
      updatedAt: "2023-01-01T00:00:00Z",
      instructions: null,
      metadata: {},
      options: null,
      title: null,
    };

    const enrichmentsClient = getProtectedClient(exa.websets.enrichments);
    const requestSpy = vi
      .spyOn(enrichmentsClient, "request")
      .mockResolvedValueOnce(mockResponse);

    const enrichmentParams = {
      description: "Test enrichment",
      format: CreateEnrichmentParametersFormat.text,
    };
    const result = await exa.websets.enrichments.create(
      "ws_123456",
      enrichmentParams
    );

    expect(requestSpy).toHaveBeenCalledWith(
      "/v0/websets/ws_123456/enrichments",
      "POST",
      enrichmentParams
    );
    expect(result).toEqual(mockResponse);
  });

  it("should list items in a Webset", async () => {
    const mockItemData: WebsetItem = {
      id: "ws_item_123456",
      object: "webset_item",
      source: WebsetItemSource.search,
      sourceId: "ws_search_123456",
      websetId: "ws_123456",
      properties: {
        type: "company",
        url: "https://example.com",
        description: "Example company",
        company: {
          name: "Example Inc.",
          about: null,
          employees: null,
          industry: null,
          location: null,
          logoUrl: null,
        },
        content: null,
      },
      evaluations: [],
      enrichments: null,
      createdAt: "2023-01-01T00:00:00Z",
      updatedAt: "2023-01-01T00:00:00Z",
    };
    const mockResponse: ListWebsetItemResponse = {
      data: [mockItemData],
      hasMore: false,
      nextCursor: null,
    };

    const itemsClient = getProtectedClient(exa.websets.items);
    const requestSpy = vi
      .spyOn(itemsClient, "request")
      .mockResolvedValueOnce(mockResponse);

    const listOptions = { limit: 5 };
    const result = await exa.websets.items.list("ws_123456", listOptions);

    expect(requestSpy).toHaveBeenCalledWith(
      "/v0/websets/ws_123456/items",
      "GET",
      undefined,
      listOptions
    );
    expect(result).toEqual(mockResponse);
  });

  it("should handle structured API errors correctly", async () => {
    const websetsClient = getProtectedClient(exa.websets);

    // Create a mock API error structure
    const mockApiError = {
      statusCode: 404,
      timestamp: "2023-04-10T16:28:16.627Z",
      message: "Cannot GET /websets/cm99fqxpp0008kw0i8eq3glp2/itemss",
      error: "Not Found",
      path: "/websets/cm99fqxpp0008kw0i8eq3glp2/itemss",
    };

    // Mock the Exa client's request method to throw an ExaError directly
    vi.spyOn(exa, "request").mockImplementation(() => {
      throw new ExaError(
        mockApiError.message,
        mockApiError.statusCode,
        mockApiError.timestamp,
        mockApiError.path
      );
    });

    await expect(
      websetsClient.request("/v0/websets/nonexistent-id/itemss", "GET")
    ).rejects.toThrow(ExaError);

    await expect(
      websetsClient.request("/v0/websets/nonexistent-id/itemss", "GET")
    ).rejects.toMatchObject({
      statusCode: 404,
      path: "/websets/cm99fqxpp0008kw0i8eq3glp2/itemss",
      message: "Cannot GET /websets/cm99fqxpp0008kw0i8eq3glp2/itemss",
    });
  });

  it("should wait until a Webset is idle", async () => {
    const mockRunningResponse: Webset = {
      id: "ws_123456",
      object: "webset",
      status: WebsetStatus.running,
      searches: [],
      enrichments: [],
      monitors: [],
      createdAt: "",
      updatedAt: "",
      externalId: null,
      metadata: {},
      imports: [],
      streams: [],
      title: null,
    };
    const mockIdleResponse: Webset = {
      id: "ws_123456",
      object: "webset",
      status: WebsetStatus.idle,
      searches: [],
      enrichments: [],
      monitors: [],
      imports: [],
      streams: [],
      title: "Test Webset",
      createdAt: "2023-01-01T00:00:00Z",
      updatedAt: "2023-01-01T00:00:00Z",
      externalId: null,
      metadata: {},
    };

    const getSpy = vi
      .spyOn(exa.websets, "get")
      .mockResolvedValueOnce(mockRunningResponse)
      .mockResolvedValueOnce(mockIdleResponse);

    const originalSetTimeout = global.setTimeout;
    vi.spyOn(global, "setTimeout").mockImplementation((cb: any) => {
      if (typeof cb === "function") cb();
      return 123 as unknown as NodeJS.Timeout;
    });

    const onPollMock = vi.fn();
    const result = await exa.websets.waitUntilIdle("ws_123456", {
      pollInterval: 10,
      onPoll: onPollMock,
    });

    // Verify 'get' was called twice (running then idle)
    expect(getSpy).toHaveBeenCalledTimes(2);
    expect(getSpy).toHaveBeenNthCalledWith(1, "ws_123456");
    expect(getSpy).toHaveBeenNthCalledWith(2, "ws_123456");

    // Verify onPoll was called with the running status
    expect(onPollMock).toHaveBeenCalledWith(WebsetStatus.running);

    // Verify the final result
    expect(result).toEqual(mockIdleResponse);
    expect(result.status).toBe(WebsetStatus.idle);

    // Restore setTimeout
    global.setTimeout = originalSetTimeout;
  });

  it("should list events", async () => {
    const mockEventData: Event = {
      id: "ev_123456",
      object: "event",
      type: EventType.webset_created,
      createdAt: "2023-01-01T00:00:00Z",
      data: {
        id: "ws_123456",
        object: "webset",
        status: WebsetStatus.idle,
        searches: [],
        enrichments: [],
        monitors: [],
        imports: [],
        streams: [],
        title: "Test Webset",
        createdAt: "2023-01-01T00:00:00Z",
        updatedAt: "2023-01-01T00:00:00Z",
        externalId: null,
        metadata: {},
      },
    };
    const mockResponse: ListEventsResponse = {
      data: [mockEventData],
      hasMore: false,
      nextCursor: null,
    };

    const eventsClient = getProtectedClient(exa.websets.events);
    const requestSpy = vi
      .spyOn(eventsClient, "request")
      .mockResolvedValueOnce(mockResponse);

    const listOptions = {
      limit: 10,
      types: [EventType.webset_created, EventType.webset_deleted],
    };
    const result = await exa.websets.events.list(listOptions);

    expect(requestSpy).toHaveBeenCalledWith(
      "/v0/events",
      "GET",
      undefined,
      listOptions
    );
    expect(result).toEqual(mockResponse);
  });

  it("should get an event by ID", async () => {
    const mockResponse: Event = {
      id: "ev_123456",
      object: "event",
      type: EventType.webset_created,
      createdAt: "2023-01-01T00:00:00Z",
      data: {
        id: "ws_123456",
        object: "webset",
        status: WebsetStatus.idle,
        searches: [],
        enrichments: [],
        monitors: [],
        imports: [],
        streams: [],
        title: "Test Webset",
        createdAt: "2023-01-01T00:00:00Z",
        updatedAt: "2023-01-01T00:00:00Z",
        externalId: null,
        metadata: {},
      },
    };

    const eventsClient = getProtectedClient(exa.websets.events);
    const requestSpy = vi
      .spyOn(eventsClient, "request")
      .mockResolvedValueOnce(mockResponse);

    const result = await exa.websets.events.get("ev_123456");

    expect(requestSpy).toHaveBeenCalledWith("/v0/events/ev_123456", "GET");
    expect(result).toEqual(mockResponse);
  });
});
