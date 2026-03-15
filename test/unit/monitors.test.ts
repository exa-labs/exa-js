import { beforeEach, describe, expect, it, vi } from "vitest";
import Exa from "../../src";
import {
  CreateSearchMonitorParams,
  CreateSearchMonitorResponse,
  ListSearchMonitorRunsResponse,
  ListSearchMonitorsResponse,
  SearchMonitor,
  SearchMonitorRun,
  TriggerSearchMonitorResponse,
  UpdateSearchMonitorParams,
} from "../../src/monitors/types";
import { getProtectedClient } from "./helpers";

describe("Search Monitors API", () => {
  let exa: Exa;

  const createMockMonitor = (): SearchMonitor => ({
    id: "sm_123456",
    name: "Test Monitor",
    status: "active",
    search: {
      query: "AI startups",
      numResults: 10,
      includeDomains: ["techcrunch.com"],
    },
    trigger: {
      type: "cron",
      expression: "0 9 * * 1",
      timezone: "America/New_York",
    },
    outputSchema: null,
    metadata: { team: "research" },
    webhook: {
      url: "https://example.com/webhook",
      events: ["monitor.run.completed"],
    },
    nextRunAt: "2024-01-08T09:00:00Z",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  });

  const createMockMonitorRun = (): SearchMonitorRun => ({
    id: "run_123456",
    monitorId: "sm_123456",
    status: "completed",
    output: {
      results: [{ title: "AI Startup Raises $10M" }],
      content: "Summary of results",
      grounding: [
        {
          url: "https://techcrunch.com/article",
          title: "AI Startup Article",
        },
      ],
    },
    failReason: null,
    startedAt: "2024-01-08T09:00:00Z",
    completedAt: "2024-01-08T09:05:00Z",
    failedAt: null,
    cancelledAt: null,
    durationMs: 300000,
    createdAt: "2024-01-08T09:00:00Z",
    updatedAt: "2024-01-08T09:05:00Z",
  });

  beforeEach(() => {
    vi.resetAllMocks();
    exa = new Exa("test-api-key", "https://api.exa.ai");
  });

  describe("Monitor Operations", () => {
    it("should create a new Search Monitor", async () => {
      const mockResponse: CreateSearchMonitorResponse = {
        ...createMockMonitor(),
        webhookSecret: "whsec_test123",
      };

      const monitorsClient = getProtectedClient(exa.monitors);
      const requestSpy = vi
        .spyOn(monitorsClient, "request")
        .mockResolvedValueOnce(mockResponse);

      const createParams: CreateSearchMonitorParams = {
        name: "Test Monitor",
        search: {
          query: "AI startups",
          numResults: 10,
          includeDomains: ["techcrunch.com"],
        },
        trigger: {
          type: "cron",
          expression: "0 9 * * 1",
          timezone: "America/New_York",
        },
        metadata: { team: "research" },
        webhook: {
          url: "https://example.com/webhook",
          events: ["monitor.run.completed"],
        },
      };

      const result = await exa.monitors.create(createParams);

      expect(requestSpy).toHaveBeenCalledWith("", "POST", createParams);
      expect(result).toEqual(mockResponse);
      expect(result.webhookSecret).toBe("whsec_test123");
    });

    it("should get a Search Monitor by ID", async () => {
      const mockResponse: SearchMonitor = createMockMonitor();

      const monitorsClient = getProtectedClient(exa.monitors);
      const requestSpy = vi
        .spyOn(monitorsClient, "request")
        .mockResolvedValueOnce(mockResponse);

      const result = await exa.monitors.get("sm_123456");

      expect(requestSpy).toHaveBeenCalledWith("/sm_123456", "GET");
      expect(result).toEqual(mockResponse);
    });

    it("should list Search Monitors", async () => {
      const mockResponse: ListSearchMonitorsResponse = {
        data: [createMockMonitor()],
        hasMore: false,
        nextCursor: null,
      };

      const monitorsClient = getProtectedClient(exa.monitors);
      const requestSpy = vi
        .spyOn(monitorsClient, "request")
        .mockResolvedValueOnce(mockResponse);

      const listOptions = { limit: 10, status: "active" as const };
      const result = await exa.monitors.list(listOptions);

      expect(requestSpy).toHaveBeenCalledWith("", "GET", undefined, {
        limit: 10,
        status: "active",
      });
      expect(result).toEqual(mockResponse);
    });

    it("should list Search Monitors without options", async () => {
      const mockResponse: ListSearchMonitorsResponse = {
        data: [createMockMonitor()],
        hasMore: false,
        nextCursor: null,
      };

      const monitorsClient = getProtectedClient(exa.monitors);
      const requestSpy = vi
        .spyOn(monitorsClient, "request")
        .mockResolvedValueOnce(mockResponse);

      const result = await exa.monitors.list();

      expect(requestSpy).toHaveBeenCalledWith("", "GET", undefined, {});
      expect(result).toEqual(mockResponse);
    });

    it("should update a Search Monitor", async () => {
      const mockResponse: SearchMonitor = {
        ...createMockMonitor(),
        status: "paused",
        metadata: { team: "research", updated: "true" },
      };

      const monitorsClient = getProtectedClient(exa.monitors);
      const requestSpy = vi
        .spyOn(monitorsClient, "request")
        .mockResolvedValueOnce(mockResponse);

      const updateParams: UpdateSearchMonitorParams = {
        status: "paused",
        metadata: { team: "research", updated: "true" },
      };

      const result = await exa.monitors.update("sm_123456", updateParams);

      expect(requestSpy).toHaveBeenCalledWith(
        "/sm_123456",
        "PATCH",
        updateParams
      );
      expect(result).toEqual(mockResponse);
    });

    it("should delete a Search Monitor", async () => {
      const mockResponse: SearchMonitor = createMockMonitor();

      const monitorsClient = getProtectedClient(exa.monitors);
      const requestSpy = vi
        .spyOn(monitorsClient, "request")
        .mockResolvedValueOnce(mockResponse);

      const result = await exa.monitors.delete("sm_123456");

      expect(requestSpy).toHaveBeenCalledWith("/sm_123456", "DELETE");
      expect(result).toEqual(mockResponse);
    });

    it("should trigger a Search Monitor", async () => {
      const mockResponse: TriggerSearchMonitorResponse = {
        triggered: true,
      };

      const monitorsClient = getProtectedClient(exa.monitors);
      const requestSpy = vi
        .spyOn(monitorsClient, "request")
        .mockResolvedValueOnce(mockResponse);

      const result = await exa.monitors.trigger("sm_123456");

      expect(requestSpy).toHaveBeenCalledWith("/sm_123456/trigger", "POST");
      expect(result).toEqual(mockResponse);
      expect(result.triggered).toBe(true);
    });
  });

  describe("Monitor Runs Operations", () => {
    it("should list Search Monitor runs", async () => {
      const mockResponse: ListSearchMonitorRunsResponse = {
        data: [createMockMonitorRun()],
        hasMore: false,
        nextCursor: null,
      };

      const runsClient = getProtectedClient(exa.monitors.runs);
      const requestSpy = vi
        .spyOn(runsClient, "request")
        .mockResolvedValueOnce(mockResponse);

      const listOptions = { limit: 5 };
      const result = await exa.monitors.runs.list("sm_123456", listOptions);

      expect(requestSpy).toHaveBeenCalledWith(
        "/sm_123456/runs",
        "GET",
        undefined,
        { limit: 5 }
      );
      expect(result).toEqual(mockResponse);
    });

    it("should list Search Monitor runs without options", async () => {
      const mockResponse: ListSearchMonitorRunsResponse = {
        data: [],
        hasMore: false,
        nextCursor: null,
      };

      const runsClient = getProtectedClient(exa.monitors.runs);
      const requestSpy = vi
        .spyOn(runsClient, "request")
        .mockResolvedValueOnce(mockResponse);

      const result = await exa.monitors.runs.list("sm_123456");

      expect(requestSpy).toHaveBeenCalledWith(
        "/sm_123456/runs",
        "GET",
        undefined,
        {}
      );
      expect(result).toEqual(mockResponse);
    });

    it("should get a specific Search Monitor run", async () => {
      const mockResponse: SearchMonitorRun = createMockMonitorRun();

      const runsClient = getProtectedClient(exa.monitors.runs);
      const requestSpy = vi
        .spyOn(runsClient, "request")
        .mockResolvedValueOnce(mockResponse);

      const result = await exa.monitors.runs.get("sm_123456", "run_123456");

      expect(requestSpy).toHaveBeenCalledWith(
        "/sm_123456/runs/run_123456",
        "GET"
      );
      expect(result).toEqual(mockResponse);
    });

    it("should paginate through all runs with listAll", async () => {
      const run1 = { ...createMockMonitorRun(), id: "run_1" };
      const run2 = { ...createMockMonitorRun(), id: "run_2" };
      const run3 = { ...createMockMonitorRun(), id: "run_3" };

      const runsClient = getProtectedClient(exa.monitors.runs);
      vi.spyOn(runsClient, "request")
        .mockResolvedValueOnce({
          data: [run1, run2],
          hasMore: true,
          nextCursor: "cursor_1",
        } as ListSearchMonitorRunsResponse)
        .mockResolvedValueOnce({
          data: [run3],
          hasMore: false,
          nextCursor: null,
        } as ListSearchMonitorRunsResponse);

      const runs: SearchMonitorRun[] = [];
      for await (const run of exa.monitors.runs.listAll("sm_123456")) {
        runs.push(run);
      }

      expect(runs).toHaveLength(3);
      expect(runs[0].id).toBe("run_1");
      expect(runs[2].id).toBe("run_3");
    });

    it("should collect all runs with getAll", async () => {
      const run1 = { ...createMockMonitorRun(), id: "run_1" };
      const run2 = { ...createMockMonitorRun(), id: "run_2" };

      const runsClient = getProtectedClient(exa.monitors.runs);
      vi.spyOn(runsClient, "request").mockResolvedValueOnce({
        data: [run1, run2],
        hasMore: false,
        nextCursor: null,
      } as ListSearchMonitorRunsResponse);

      const runs = await exa.monitors.runs.getAll("sm_123456");

      expect(runs).toHaveLength(2);
      expect(runs[0].id).toBe("run_1");
      expect(runs[1].id).toBe("run_2");
    });
  });

  describe("Pagination Helpers", () => {
    it("should paginate through all monitors with listAll", async () => {
      const monitor1 = { ...createMockMonitor(), id: "sm_1" };
      const monitor2 = { ...createMockMonitor(), id: "sm_2" };
      const monitor3 = { ...createMockMonitor(), id: "sm_3" };

      const monitorsClient = getProtectedClient(exa.monitors);
      const requestSpy = vi
        .spyOn(monitorsClient, "request")
        .mockResolvedValueOnce({
          data: [monitor1, monitor2],
          hasMore: true,
          nextCursor: "cursor_1",
        } as ListSearchMonitorsResponse)
        .mockResolvedValueOnce({
          data: [monitor3],
          hasMore: false,
          nextCursor: null,
        } as ListSearchMonitorsResponse);

      const monitors: SearchMonitor[] = [];
      for await (const monitor of exa.monitors.listAll()) {
        monitors.push(monitor);
      }

      expect(monitors).toHaveLength(3);
      expect(monitors[0].id).toBe("sm_1");
      expect(monitors[1].id).toBe("sm_2");
      expect(monitors[2].id).toBe("sm_3");
      expect(requestSpy).toHaveBeenCalledTimes(2);
    });

    it("should collect all monitors with getAll", async () => {
      const monitor1 = { ...createMockMonitor(), id: "sm_1" };
      const monitor2 = { ...createMockMonitor(), id: "sm_2" };

      const monitorsClient = getProtectedClient(exa.monitors);
      vi.spyOn(monitorsClient, "request").mockResolvedValueOnce({
        data: [monitor1, monitor2],
        hasMore: false,
        nextCursor: null,
      } as ListSearchMonitorsResponse);

      const monitors = await exa.monitors.getAll();

      expect(monitors).toHaveLength(2);
      expect(monitors[0].id).toBe("sm_1");
      expect(monitors[1].id).toBe("sm_2");
    });
  });
});
