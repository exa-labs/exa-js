import { beforeEach, describe, expect, it, vi } from "vitest";
import Exa from "../src";
import {
  CreateStreamParameters,
  ListStreamRunsResponse,
  ListStreamsResponse,
  Stream,
  StreamObject,
  StreamRun,
  StreamRunObject,
  StreamRunStatus,
  StreamRunType,
  StreamStatus,
  UpdateStream,
  UpdateStreamStatus,
  WebsetSearchBehavior,
} from "../src/websets/openapi";
import { getProtectedClient } from "./helpers";

describe("Websets Streams API", () => {
  let exa: Exa;

  // Helper to create a mock StreamRun
  const createMockStreamRun = (): StreamRun => ({
    id: "run_123456",
    object: StreamRunObject.stream_run,
    status: StreamRunStatus.completed,
    streamId: "stream_123456",
    type: StreamRunType.search,
    completedAt: "2023-01-08T09:30:00Z",
    failedAt: null,
    canceledAt: null,
    createdAt: "2023-01-08T09:00:00Z",
    updatedAt: "2023-01-08T09:30:00Z",
  });

  beforeEach(() => {
    vi.resetAllMocks();
    exa = new Exa("test-api-key", "https://api.exa.ai");
  });

  describe("Stream Operations", () => {
    it("should create a new Stream", async () => {
      const mockResponse: Stream = {
        id: "stream_123456",
        object: StreamObject.stream,
        status: StreamStatus.open,
        websetId: "ws_123456",
        cadence: {
          cron: "0 9 * * 1",
          timezone: "America/New_York",
        },
        behavior: {
          type: "search",
          config: {
            query: "AI startups",
            criteria: [{ description: "Must be an AI company" }],
            entity: { type: "company" },
            count: 10,
            behavior: WebsetSearchBehavior.append,
          },
        },
        lastRun: createMockStreamRun(),
        nextRunAt: "2023-01-08T09:00:00Z",
        metadata: {},
        createdAt: "2023-01-01T00:00:00Z",
        updatedAt: "2023-01-01T00:00:00Z",
      };

      const streamsClient = getProtectedClient(exa.websets.streams);
      const requestSpy = vi
        .spyOn(streamsClient, "request")
        .mockResolvedValueOnce(mockResponse);

      const createParams: CreateStreamParameters = {
        websetId: "ws_123456",
        cadence: {
          cron: "0 9 * * 1",
          timezone: "America/New_York",
        },
        behavior: {
          type: "search",
          config: {
            query: "AI startups",
            criteria: [{ description: "Must be an AI company" }],
            entity: { type: "company" },
            count: 10,
            behavior: WebsetSearchBehavior.append,
          },
        },
      };

      const result = await exa.websets.streams.create(createParams);

      expect(requestSpy).toHaveBeenCalledWith(
        "/v0/streams",
        "POST",
        createParams
      );
      expect(result).toEqual(mockResponse);
    });

    it("should get a Stream by ID", async () => {
      const mockResponse: Stream = {
        id: "stream_123456",
        object: StreamObject.stream,
        status: StreamStatus.open,
        websetId: "ws_123456",
        cadence: {
          cron: "0 9 * * 1",
          timezone: "America/New_York",
        },
        behavior: {
          type: "search",
          config: {
            query: "AI startups",
            criteria: [{ description: "Must be an AI company" }],
            entity: { type: "company" },
            count: 10,
            behavior: WebsetSearchBehavior.append,
          },
        },
        lastRun: createMockStreamRun(),
        nextRunAt: "2023-01-08T09:00:00Z",
        metadata: {},
        createdAt: "2023-01-01T00:00:00Z",
        updatedAt: "2023-01-01T00:00:00Z",
      };

      const streamsClient = getProtectedClient(exa.websets.streams);
      const requestSpy = vi
        .spyOn(streamsClient, "request")
        .mockResolvedValueOnce(mockResponse);

      const result = await exa.websets.streams.get("stream_123456");

      expect(requestSpy).toHaveBeenCalledWith(
        "/v0/streams/stream_123456",
        "GET"
      );
      expect(result).toEqual(mockResponse);
    });

    it("should list Streams", async () => {
      const mockStreamData: Stream = {
        id: "stream_123456",
        object: StreamObject.stream,
        status: StreamStatus.open,
        websetId: "ws_123456",
        cadence: {
          cron: "0 9 * * 1",
          timezone: "America/New_York",
        },
        behavior: {
          type: "search",
          config: {
            query: "AI startups",
            criteria: [{ description: "Must be an AI company" }],
            entity: { type: "company" },
            count: 10,
            behavior: WebsetSearchBehavior.append,
          },
        },
        lastRun: createMockStreamRun(),
        nextRunAt: "2023-01-08T09:00:00Z",
        metadata: {},
        createdAt: "2023-01-01T00:00:00Z",
        updatedAt: "2023-01-01T00:00:00Z",
      };

      const mockResponse: ListStreamsResponse = {
        data: [mockStreamData],
        hasMore: false,
        nextCursor: null,
      };

      const streamsClient = getProtectedClient(exa.websets.streams);
      const requestSpy = vi
        .spyOn(streamsClient, "request")
        .mockResolvedValueOnce(mockResponse);

      const listOptions = { limit: 10, websetId: "ws_123456" };
      const result = await exa.websets.streams.list(listOptions);

      expect(requestSpy).toHaveBeenCalledWith(
        "/v0/streams",
        "GET",
        undefined,
        listOptions
      );
      expect(result).toEqual(mockResponse);
    });

    it("should update a Stream", async () => {
      const mockResponse: Stream = {
        id: "stream_123456",
        object: StreamObject.stream,
        status: StreamStatus.closed,
        websetId: "ws_123456",
        cadence: {
          cron: "0 9 * * 1",
          timezone: "America/New_York",
        },
        behavior: {
          type: "search",
          config: {
            query: "AI startups",
            criteria: [{ description: "Must be an AI company" }],
            entity: { type: "company" },
            count: 10,
            behavior: WebsetSearchBehavior.append,
          },
        },
        lastRun: createMockStreamRun(),
        nextRunAt: null,
        metadata: { updated: "true" },
        createdAt: "2023-01-01T00:00:00Z",
        updatedAt: "2023-01-01T01:00:00Z",
      };

      const streamsClient = getProtectedClient(exa.websets.streams);
      const requestSpy = vi
        .spyOn(streamsClient, "request")
        .mockResolvedValueOnce(mockResponse);

      const updateParams: UpdateStream = {
        status: UpdateStreamStatus.closed,
        metadata: { updated: "true" },
      };

      const result = await exa.websets.streams.update(
        "stream_123456",
        updateParams
      );

      expect(requestSpy).toHaveBeenCalledWith(
        "/v0/streams/stream_123456",
        "PATCH",
        updateParams
      );
      expect(result).toEqual(mockResponse);
    });

    it("should delete a Stream", async () => {
      const mockResponse: Stream = {
        id: "stream_123456",
        object: StreamObject.stream,
        status: StreamStatus.closed,
        websetId: "ws_123456",
        cadence: {
          cron: "0 9 * * 1",
          timezone: "America/New_York",
        },
        behavior: {
          type: "search",
          config: {
            query: "AI startups",
            criteria: [{ description: "Must be an AI company" }],
            entity: { type: "company" },
            count: 10,
            behavior: WebsetSearchBehavior.append,
          },
        },
        lastRun: createMockStreamRun(),
        nextRunAt: null,
        metadata: {},
        createdAt: "2023-01-01T00:00:00Z",
        updatedAt: "2023-01-01T00:00:00Z",
      };

      const streamsClient = getProtectedClient(exa.websets.streams);
      const requestSpy = vi
        .spyOn(streamsClient, "request")
        .mockResolvedValueOnce(mockResponse);

      const result = await exa.websets.streams.delete("stream_123456");

      expect(requestSpy).toHaveBeenCalledWith(
        "/v0/streams/stream_123456",
        "DELETE"
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe("Stream Runs Operations", () => {
    it("should list Stream runs", async () => {
      const mockRunData: StreamRun = createMockStreamRun();

      const mockResponse: ListStreamRunsResponse = {
        data: [mockRunData],
        hasMore: false,
        nextCursor: null,
      };

      const runsClient = getProtectedClient(exa.websets.streams.runs);
      const requestSpy = vi
        .spyOn(runsClient, "request")
        .mockResolvedValueOnce(mockResponse);

      const listOptions = { limit: 5 };
      const result = await exa.websets.streams.runs.list(
        "stream_123456",
        listOptions
      );

      expect(requestSpy).toHaveBeenCalledWith(
        "/v0/streams/stream_123456/runs",
        "GET",
        undefined,
        { cursor: undefined, limit: 5 }
      );
      expect(result).toEqual(mockResponse);
    });

    it("should get a specific Stream run", async () => {
      const mockResponse: StreamRun = createMockStreamRun();

      const runsClient = getProtectedClient(exa.websets.streams.runs);
      const requestSpy = vi
        .spyOn(runsClient, "request")
        .mockResolvedValueOnce(mockResponse);

      const result = await exa.websets.streams.runs.get(
        "stream_123456",
        "run_123456"
      );

      expect(requestSpy).toHaveBeenCalledWith(
        "/v0/streams/stream_123456/runs/run_123456",
        "GET"
      );
      expect(result).toEqual(mockResponse);
    });
  });
});
