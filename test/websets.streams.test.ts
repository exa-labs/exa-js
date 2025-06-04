import { beforeEach, describe, expect, it, vi } from "vitest";
import Exa from "../src";
import {
  CreateMonitorParameters,
  ListMonitorRunsResponse,
  ListMonitorsResponse,
  Monitor,
  MonitorObject,
  MonitorRun,
  MonitorRunObject,
  MonitorRunStatus,
  MonitorRunType,
  MonitorStatus,
  UpdateMonitor,
  UpdateMonitorStatus,
  WebsetSearchBehavior,
} from "../src/websets/openapi";
import { getProtectedClient } from "./helpers";

describe("Websets Monitors API", () => {
  let exa: Exa;

  // Helper to create a mock MonitorRun
  const createMockMonitorRun = (): MonitorRun => ({
    id: "run_123456",
    object: MonitorRunObject.monitor_run,
    status: MonitorRunStatus.completed,
    monitorId: "monitor_123456",
    type: MonitorRunType.search,
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

  describe("Monitor Operations", () => {
    it("should create a new Monitor", async () => {
      const mockResponse: Monitor = {
        id: "monitor_123456",
        object: MonitorObject.monitor,
        status: MonitorStatus.enabled,
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
        lastRun: createMockMonitorRun(),
        nextRunAt: "2023-01-08T09:00:00Z",
        metadata: {},
        createdAt: "2023-01-01T00:00:00Z",
        updatedAt: "2023-01-01T00:00:00Z",
      };

      const monitorsClient = getProtectedClient(exa.websets.monitors);
      const requestSpy = vi
        .spyOn(monitorsClient, "request")
        .mockResolvedValueOnce(mockResponse);

      const createParams: CreateMonitorParameters = {
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

      const result = await exa.websets.monitors.create(createParams);

      expect(requestSpy).toHaveBeenCalledWith(
        "/v0/monitors",
        "POST",
        createParams
      );
      expect(result).toEqual(mockResponse);
    });

    it("should get a Monitor by ID", async () => {
      const mockResponse: Monitor = {
        id: "monitor_123456",
        object: MonitorObject.monitor,
        status: MonitorStatus.enabled,
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
        lastRun: createMockMonitorRun(),
        nextRunAt: "2023-01-08T09:00:00Z",
        metadata: {},
        createdAt: "2023-01-01T00:00:00Z",
        updatedAt: "2023-01-01T00:00:00Z",
      };

      const monitorsClient = getProtectedClient(exa.websets.monitors);
      const requestSpy = vi
        .spyOn(monitorsClient, "request")
        .mockResolvedValueOnce(mockResponse);

      const result = await exa.websets.monitors.get("monitor_123456");

      expect(requestSpy).toHaveBeenCalledWith(
        "/v0/monitors/monitor_123456",
        "GET"
      );
      expect(result).toEqual(mockResponse);
    });

    it("should list Monitors", async () => {
      const mockMonitorData: Monitor = {
        id: "monitor_123456",
        object: MonitorObject.monitor,
        status: MonitorStatus.enabled,
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
        lastRun: createMockMonitorRun(),
        nextRunAt: "2023-01-08T09:00:00Z",
        metadata: {},
        createdAt: "2023-01-01T00:00:00Z",
        updatedAt: "2023-01-01T00:00:00Z",
      };

      const mockResponse: ListMonitorsResponse = {
        data: [mockMonitorData],
        hasMore: false,
        nextCursor: null,
      };

      const monitorsClient = getProtectedClient(exa.websets.monitors);
      const requestSpy = vi
        .spyOn(monitorsClient, "request")
        .mockResolvedValueOnce(mockResponse);

      const listOptions = { limit: 10, websetId: "ws_123456" };
      const result = await exa.websets.monitors.list(listOptions);

      expect(requestSpy).toHaveBeenCalledWith(
        "/v0/monitors",
        "GET",
        undefined,
        listOptions
      );
      expect(result).toEqual(mockResponse);
    });

    it("should update a Monitor", async () => {
      const mockResponse: Monitor = {
        id: "monitor_123456",
        object: MonitorObject.monitor,
        status: MonitorStatus.disabled,
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
        lastRun: createMockMonitorRun(),
        nextRunAt: null,
        metadata: { updated: "true" },
        createdAt: "2023-01-01T00:00:00Z",
        updatedAt: "2023-01-01T01:00:00Z",
      };

      const monitorsClient = getProtectedClient(exa.websets.monitors);
      const requestSpy = vi
        .spyOn(monitorsClient, "request")
        .mockResolvedValueOnce(mockResponse);

      const updateParams: UpdateMonitor = {
        status: UpdateMonitorStatus.disabled,
        metadata: { updated: "true" },
      };

      const result = await exa.websets.monitors.update(
        "monitor_123456",
        updateParams
      );

      expect(requestSpy).toHaveBeenCalledWith(
        "/v0/monitors/monitor_123456",
        "PATCH",
        updateParams
      );
      expect(result).toEqual(mockResponse);
    });

    it("should delete a Monitor", async () => {
      const mockResponse: Monitor = {
        id: "monitor_123456",
        object: MonitorObject.monitor,
        status: MonitorStatus.disabled,
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
        lastRun: createMockMonitorRun(),
        nextRunAt: null,
        metadata: {},
        createdAt: "2023-01-01T00:00:00Z",
        updatedAt: "2023-01-01T00:00:00Z",
      };

      const monitorsClient = getProtectedClient(exa.websets.monitors);
      const requestSpy = vi
        .spyOn(monitorsClient, "request")
        .mockResolvedValueOnce(mockResponse);

      const result = await exa.websets.monitors.delete("monitor_123456");

      expect(requestSpy).toHaveBeenCalledWith(
        "/v0/monitors/monitor_123456",
        "DELETE"
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe("Monitor Runs Operations", () => {
    it("should list Monitor runs", async () => {
      const mockRunData: MonitorRun = createMockMonitorRun();

      const mockResponse: ListMonitorRunsResponse = {
        data: [mockRunData],
        hasMore: false,
        nextCursor: null,
      };

      const runsClient = getProtectedClient(exa.websets.monitors.runs);
      const requestSpy = vi
        .spyOn(runsClient, "request")
        .mockResolvedValueOnce(mockResponse);

      const listOptions = { limit: 5 };
      const result = await exa.websets.monitors.runs.list(
        "monitor_123456",
        listOptions
      );

      expect(requestSpy).toHaveBeenCalledWith(
        "/v0/monitors/monitor_123456/runs",
        "GET",
        undefined,
        { cursor: undefined, limit: 5 }
      );
      expect(result).toEqual(mockResponse);
    });

    it("should get a specific Monitor run", async () => {
      const mockResponse: MonitorRun = createMockMonitorRun();

      const runsClient = getProtectedClient(exa.websets.monitors.runs);
      const requestSpy = vi
        .spyOn(runsClient, "request")
        .mockResolvedValueOnce(mockResponse);

      const result = await exa.websets.monitors.runs.get(
        "monitor_123456",
        "run_123456"
      );

      expect(requestSpy).toHaveBeenCalledWith(
        "/v0/monitors/monitor_123456/runs/run_123456",
        "GET"
      );
      expect(result).toEqual(mockResponse);
    });
  });
});
