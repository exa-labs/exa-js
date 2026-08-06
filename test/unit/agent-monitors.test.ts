import { beforeEach, describe, expect, it, vi } from "vitest";
import Exa from "../../src";
import { AgentMonitorSnapshotFailedError } from "../../src/agent/monitors/client";
import {
  AgentMonitor,
  AgentMonitorChange,
  AgentMonitorEntityView,
  AgentMonitorSnapshot,
  CreateAgentMonitorParams,
  CreateAgentMonitorSnapshotParams,
  DeletedAgentMonitor,
  ListAgentMonitorChangesResponse,
  ListAgentMonitorEntitiesResponse,
  ListAgentMonitorsResponse,
} from "../../src/agent/monitors/types";
import { getProtectedClient } from "./helpers";

describe("Agent Monitors API", () => {
  let exa: Exa;
  const BETAS = ["agent-monitors-2026-08-04"];

  const createMockMonitor = (
    overrides: Partial<AgentMonitor> = {}
  ): AgentMonitor => ({
    id: "agentmon_01hzx3example",
    object: "agent_monitor",
    status: "active",
    cadence: "7d",
    fields: [
      {
        id: "agentfield_01hzx3field1",
        name: "ceo",
        description: "The company's current CEO",
        type: "static",
      },
      {
        id: "agentfield_01hzx3field2",
        name: "funding",
        description: "New funding rounds",
        type: "dynamic",
      },
    ],
    entityCount: 2,
    version: 3,
    createdAt: "2026-01-01T00:00:00.000Z",
    lastRefreshAt: "2026-01-08T00:00:00.000Z",
    refresh: { state: "idle" },
    creation: { state: "idle" },
    usage: { totalAcus: 12, lastRefreshAcus: 4 },
    ...overrides,
  });

  const createMockEntityView = (): AgentMonitorEntityView => ({
    entity: {
      id: "agententity_01hzx3entity1",
      name: "Acme Corp",
      domain: "acme.com",
    },
    contents: {
      agentfield_01hzx3field1: {
        value: "Jane Doe",
        sourceUrls: ["https://acme.com/about"],
        updatedAt: "2026-01-08T00:00:00.000Z",
      },
    },
  });

  const createMockChange = (): AgentMonitorChange => ({
    type: "content.upserted",
    entity: { id: "agententity_01hzx3entity1", name: "Acme Corp" },
    field: { id: "agentfield_01hzx3field2", name: "funding" },
    content: {
      value: "Raised a $30M Series B",
      sourceUrls: ["https://news.example.com/acme-series-b"],
      updatedAt: "2026-01-08T00:00:00.000Z",
    },
    version: 3,
    createdAt: "2026-01-08T00:00:01.000Z",
  });

  const snapshotBase = {
    id: "agentsnap_01hzx3snap1",
    object: "agent_monitor.snapshot" as const,
    startTime: "2026-01-01T00:00:00.000Z",
    endTime: "2026-01-08T00:00:00.000Z",
    createdAt: "2026-01-09T00:00:00.000Z",
    expiresAt: "2026-01-10T00:00:00.000Z",
  };

  const runningSnapshot: AgentMonitorSnapshot = {
    ...snapshotBase,
    status: "running",
  };

  beforeEach(() => {
    vi.resetAllMocks();
    exa = new Exa("test-api-key", "https://api.exa.ai");
  });

  describe("Monitor Operations", () => {
    it("exposes monitors only in beta and sends beta values as headers", async () => {
      expect((exa.agent as any).monitors).toBeUndefined();
      expect(exa.beta.agent.monitors).toBeDefined();

      const requestSpy = vi
        .spyOn(exa, "request")
        .mockResolvedValueOnce(createMockMonitor());

      await exa.beta.agent.monitors.get("agentmon_01hzx3example", {
        betas: BETAS,
      });

      expect(requestSpy).toHaveBeenCalledWith(
        "/agent/monitors/agentmon_01hzx3example",
        "GET",
        undefined,
        undefined,
        { "Exa-Beta": "agent-monitors-2026-08-04" }
      );
    });

    it("rejects an empty beta list", async () => {
      await expect(
        exa.beta.agent.monitors.get("agentmon_01hzx3example", { betas: [] })
      ).rejects.toThrow(
        'betas must include the Agent Monitors beta identifier ("agent-monitors-2026-08-04")'
      );
    });

    it("rejects a beta list that lacks the monitors beta identifier", async () => {
      await expect(
        exa.beta.agent.monitors.get("agentmon_01hzx3example", {
          betas: ["some-other-beta"],
        })
      ).rejects.toThrow(
        'betas must include the Agent Monitors beta identifier ("agent-monitors-2026-08-04")'
      );
    });

    it("should create an Agent Monitor", async () => {
      const mockResponse = createMockMonitor({ status: "creating" });

      const monitorsClient = getProtectedClient(exa.beta.agent.monitors);
      const requestSpy = vi
        .spyOn(monitorsClient, "request")
        .mockResolvedValueOnce(mockResponse);

      const createParams: CreateAgentMonitorParams = {
        cadence: "7d",
        entities: [
          { name: "Acme Corp", domain: "acme.com" },
          {
            name: "Globex",
            domain: "globex.com",
            description: "Industrial conglomerate",
          },
        ],
        fields: [
          { name: "ceo", description: "The company's current CEO" },
          {
            name: "funding",
            description: "New funding rounds",
            type: "dynamic",
          },
        ],
      };

      const result = await exa.beta.agent.monitors.create({
        ...createParams,
        betas: BETAS,
      });

      expect(requestSpy).toHaveBeenCalledWith(
        "",
        BETAS,
        "POST",
        createParams,
        undefined,
        undefined
      );
      expect(result).toEqual(mockResponse);
      expect(result.status).toBe("creating");
    });

    it("should send the Idempotency-Key header when creating with idempotencyKey", async () => {
      const mockResponse = createMockMonitor({ status: "creating" });

      const monitorsClient = getProtectedClient(exa.beta.agent.monitors);
      const requestSpy = vi
        .spyOn(monitorsClient, "request")
        .mockResolvedValueOnce(mockResponse);

      const createParams: CreateAgentMonitorParams = {
        cadence: "12h",
        entities: [{ name: "Acme Corp", domain: "acme.com" }],
        fields: [{ name: "ceo", description: "The company's current CEO" }],
      };

      await exa.beta.agent.monitors.create(
        { ...createParams, betas: BETAS },
        {
          idempotencyKey: "my-key-1",
        }
      );

      expect(requestSpy).toHaveBeenCalledWith(
        "",
        BETAS,
        "POST",
        createParams,
        undefined,
        {
          "Idempotency-Key": "my-key-1",
        }
      );
    });

    it("should get an Agent Monitor by ID", async () => {
      const mockResponse = createMockMonitor();

      const monitorsClient = getProtectedClient(exa.beta.agent.monitors);
      const requestSpy = vi
        .spyOn(monitorsClient, "request")
        .mockResolvedValueOnce(mockResponse);

      const result = await exa.beta.agent.monitors.get(
        "agentmon_01hzx3example",
        { betas: BETAS }
      );

      expect(requestSpy).toHaveBeenCalledWith(
        "/agentmon_01hzx3example",
        BETAS,
        "GET"
      );
      expect(result).toEqual(mockResponse);
    });

    it("should list Agent Monitors with pagination params", async () => {
      const mockResponse: ListAgentMonitorsResponse = {
        object: "list",
        data: [createMockMonitor()],
        hasMore: false,
        nextCursor: null,
      };

      const monitorsClient = getProtectedClient(exa.beta.agent.monitors);
      const requestSpy = vi
        .spyOn(monitorsClient, "request")
        .mockResolvedValueOnce(mockResponse);

      const result = await exa.beta.agent.monitors.list({
        betas: BETAS,
        cursor: "agentmon_01hzxcursor",
        limit: 10,
      });

      expect(requestSpy).toHaveBeenCalledWith("", BETAS, "GET", undefined, {
        cursor: "agentmon_01hzxcursor",
        limit: 10,
      });
      expect(result).toEqual(mockResponse);
    });

    it("should iterate through all Agent Monitors with listAll", async () => {
      const firstPage: ListAgentMonitorsResponse = {
        object: "list",
        data: [createMockMonitor({ id: "agentmon_1" })],
        hasMore: true,
        nextCursor: "agentmon_1",
      };
      const secondPage: ListAgentMonitorsResponse = {
        object: "list",
        data: [createMockMonitor({ id: "agentmon_2" })],
        hasMore: false,
        nextCursor: null,
      };

      const monitorsClient = getProtectedClient(exa.beta.agent.monitors);
      const requestSpy = vi
        .spyOn(monitorsClient, "request")
        .mockResolvedValueOnce(firstPage)
        .mockResolvedValueOnce(secondPage);

      const monitors = await exa.beta.agent.monitors.getAll({ betas: BETAS });

      expect(monitors.map((monitor) => monitor.id)).toEqual([
        "agentmon_1",
        "agentmon_2",
      ]);
      expect(requestSpy).toHaveBeenCalledTimes(2);
      expect(requestSpy).toHaveBeenLastCalledWith("", BETAS, "GET", undefined, {
        cursor: "agentmon_1",
      });
    });

    it("should resume listAll from a provided cursor", async () => {
      const page: ListAgentMonitorsResponse = {
        object: "list",
        data: [createMockMonitor({ id: "agentmon_2" })],
        hasMore: false,
        nextCursor: null,
      };

      const monitorsClient = getProtectedClient(exa.beta.agent.monitors);
      const requestSpy = vi
        .spyOn(monitorsClient, "request")
        .mockResolvedValueOnce(page);

      const monitors = await exa.beta.agent.monitors.getAll({
        cursor: "agentmon_1",
        betas: BETAS,
      });

      expect(monitors.map((monitor) => monitor.id)).toEqual(["agentmon_2"]);
      expect(requestSpy).toHaveBeenCalledWith("", BETAS, "GET", undefined, {
        cursor: "agentmon_1",
      });
    });

    it("should delete an Agent Monitor", async () => {
      const mockResponse: DeletedAgentMonitor = {
        id: "agentmon_01hzx3example",
        object: "agent_monitor.deleted",
        deleted: true,
      };

      const monitorsClient = getProtectedClient(exa.beta.agent.monitors);
      const requestSpy = vi
        .spyOn(monitorsClient, "request")
        .mockResolvedValueOnce(mockResponse);

      const result = await exa.beta.agent.monitors.delete(
        "agentmon_01hzx3example",
        { betas: BETAS }
      );

      expect(requestSpy).toHaveBeenCalledWith(
        "/agentmon_01hzx3example",
        BETAS,
        "DELETE"
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe("Entity Operations", () => {
    it("should add entities to a monitor", async () => {
      const mockResponse = createMockMonitor({ entityCount: 3 });

      const entitiesClient = getProtectedClient(
        exa.beta.agent.monitors.entities
      );
      const requestSpy = vi
        .spyOn(entitiesClient, "request")
        .mockResolvedValueOnce(mockResponse);

      const params = {
        entities: [{ name: "Initech", domain: "initech.com" }],
      };
      const result = await exa.beta.agent.monitors.entities.add(
        "agentmon_01hzx3example",
        { ...params, betas: BETAS }
      );

      expect(requestSpy).toHaveBeenCalledWith(
        "/agentmon_01hzx3example/entities",
        BETAS,
        "POST",
        params
      );
      expect(result).toEqual(mockResponse);
    });

    it("should list a monitor's entities with cursor, limit, and since", async () => {
      const mockResponse: ListAgentMonitorEntitiesResponse = {
        object: "list",
        data: [createMockEntityView()],
        hasMore: false,
        nextCursor: null,
        version: 3,
      };

      const entitiesClient = getProtectedClient(
        exa.beta.agent.monitors.entities
      );
      const requestSpy = vi
        .spyOn(entitiesClient, "request")
        .mockResolvedValueOnce(mockResponse);

      const result = await exa.beta.agent.monitors.entities.list(
        "agentmon_01hzx3example",
        {
          betas: BETAS,
          cursor: "abc",
          limit: 50,
          since: "2026-01-07T00:00:00.000Z",
        }
      );

      expect(requestSpy).toHaveBeenCalledWith(
        "/agentmon_01hzx3example/entities",
        BETAS,
        "GET",
        undefined,
        { cursor: "abc", limit: 50, since: "2026-01-07T00:00:00.000Z" }
      );
      expect(result).toEqual(mockResponse);
    });

    it("should iterate through all entities with listAll", async () => {
      const firstPage: ListAgentMonitorEntitiesResponse = {
        object: "list",
        data: [createMockEntityView()],
        hasMore: true,
        nextCursor: "cursor-2",
        version: 3,
      };
      const secondPage: ListAgentMonitorEntitiesResponse = {
        object: "list",
        data: [createMockEntityView()],
        hasMore: false,
        nextCursor: null,
        version: 3,
      };

      const entitiesClient = getProtectedClient(
        exa.beta.agent.monitors.entities
      );
      const requestSpy = vi
        .spyOn(entitiesClient, "request")
        .mockResolvedValueOnce(firstPage)
        .mockResolvedValueOnce(secondPage);

      const entities = await exa.beta.agent.monitors.entities.getAll(
        "agentmon_01hzx3example",
        { betas: BETAS }
      );

      expect(entities).toHaveLength(2);
      expect(requestSpy).toHaveBeenCalledTimes(2);
      expect(requestSpy).toHaveBeenLastCalledWith(
        "/agentmon_01hzx3example/entities",
        BETAS,
        "GET",
        undefined,
        { cursor: "cursor-2" }
      );
    });

    it("should resume entities listAll from a provided cursor", async () => {
      const page: ListAgentMonitorEntitiesResponse = {
        object: "list",
        data: [createMockEntityView()],
        hasMore: false,
        nextCursor: null,
        version: 3,
      };

      const entitiesClient = getProtectedClient(
        exa.beta.agent.monitors.entities
      );
      const requestSpy = vi
        .spyOn(entitiesClient, "request")
        .mockResolvedValueOnce(page);

      const entities = await exa.beta.agent.monitors.entities.getAll(
        "agentmon_01hzx3example",
        { cursor: "cursor-2", betas: BETAS }
      );

      expect(entities).toHaveLength(1);
      expect(requestSpy).toHaveBeenCalledWith(
        "/agentmon_01hzx3example/entities",
        BETAS,
        "GET",
        undefined,
        { cursor: "cursor-2" }
      );
    });
  });

  describe("Change Feed Operations", () => {
    it("should list a monitor's changes", async () => {
      const mockResponse: ListAgentMonitorChangesResponse = {
        object: "list",
        data: [createMockChange()],
        hasMore: false,
        nextCursor: "change-cursor-1",
        version: 3,
      };

      const changesClient = getProtectedClient(exa.beta.agent.monitors.changes);
      const requestSpy = vi
        .spyOn(changesClient, "request")
        .mockResolvedValueOnce(mockResponse);

      const result = await exa.beta.agent.monitors.changes.list(
        "agentmon_01hzx3example",
        { betas: BETAS, since: "2026-01-07T00:00:00.000Z" }
      );

      expect(requestSpy).toHaveBeenCalledWith(
        "/agentmon_01hzx3example/changes",
        BETAS,
        "GET",
        undefined,
        { since: "2026-01-07T00:00:00.000Z" }
      );
      expect(result).toEqual(mockResponse);
      expect(result.data[0].createdAt).toBe("2026-01-08T00:00:01.000Z");
    });

    it("should resume the change feed from a cursor with listAll", async () => {
      const firstPage: ListAgentMonitorChangesResponse = {
        object: "list",
        data: [createMockChange()],
        hasMore: true,
        nextCursor: "change-cursor-2",
        version: 3,
      };
      const secondPage: ListAgentMonitorChangesResponse = {
        object: "list",
        data: [createMockChange()],
        hasMore: false,
        nextCursor: "change-cursor-3",
        version: 3,
      };

      const changesClient = getProtectedClient(exa.beta.agent.monitors.changes);
      const requestSpy = vi
        .spyOn(changesClient, "request")
        .mockResolvedValueOnce(firstPage)
        .mockResolvedValueOnce(secondPage);

      const changes = await exa.beta.agent.monitors.changes.getAll(
        "agentmon_01hzx3example",
        { betas: BETAS, cursor: "change-cursor-1" }
      );

      expect(changes).toHaveLength(2);
      expect(requestSpy).toHaveBeenNthCalledWith(
        1,
        "/agentmon_01hzx3example/changes",
        BETAS,
        "GET",
        undefined,
        { cursor: "change-cursor-1" }
      );
      expect(requestSpy).toHaveBeenNthCalledWith(
        2,
        "/agentmon_01hzx3example/changes",
        BETAS,
        "GET",
        undefined,
        { cursor: "change-cursor-2" }
      );
    });
  });

  describe("Snapshot Operations", () => {
    const snapshotParams: CreateAgentMonitorSnapshotParams = {
      entities: [{ name: "Acme Corp", domain: "acme.com" }],
      fields: [
        { name: "funding", description: "New funding rounds", type: "dynamic" },
      ],
      startDate: "2026-01-01",
      endDate: "2026-01-08",
      endHour: 12,
    };

    it("should start a snapshot job", async () => {
      const mockResponse = runningSnapshot;

      const snapshotsClient = getProtectedClient(
        exa.beta.agent.monitors.snapshots
      );
      const requestSpy = vi
        .spyOn(snapshotsClient, "request")
        .mockResolvedValueOnce(mockResponse);

      const result = await exa.beta.agent.monitors.snapshots.create({
        ...snapshotParams,
        betas: BETAS,
      });

      expect(requestSpy).toHaveBeenCalledWith(
        "/snapshot",
        BETAS,
        "POST",
        snapshotParams
      );
      expect(result.status).toBe("running");
    });

    it("should poll a snapshot job by ID", async () => {
      const mockResponse: AgentMonitorSnapshot = {
        ...snapshotBase,
        status: "completed",
        data: [
          {
            name: "Acme Corp",
            fields: { funding: "Raised a $30M Series B" },
            sourceUrls: ["https://news.example.com/acme-series-b"],
          },
        ],
        warnings: [],
      };

      const snapshotsClient = getProtectedClient(
        exa.beta.agent.monitors.snapshots
      );
      const requestSpy = vi
        .spyOn(snapshotsClient, "request")
        .mockResolvedValueOnce(mockResponse);

      const result = await exa.beta.agent.monitors.snapshots.get(
        "agentsnap_01hzx3snap1",
        { betas: BETAS }
      );

      expect(requestSpy).toHaveBeenCalledWith(
        "/snapshot/agentsnap_01hzx3snap1",
        BETAS,
        "GET"
      );
      expect(result.status).toBe("completed");
      if (result.status === "completed") {
        expect(result.data[0].fields.funding).toBe("Raised a $30M Series B");
      }
    });

    it("should createAndWait until the snapshot completes", async () => {
      const completed: AgentMonitorSnapshot = {
        ...snapshotBase,
        status: "completed",
        data: [],
      };

      const snapshotsClient = getProtectedClient(
        exa.beta.agent.monitors.snapshots
      );
      vi.spyOn(snapshotsClient, "request")
        .mockResolvedValueOnce(runningSnapshot)
        .mockResolvedValueOnce(runningSnapshot)
        .mockResolvedValueOnce(completed);

      const result = await exa.beta.agent.monitors.snapshots.createAndWait(
        { ...snapshotParams, betas: BETAS },
        { pollInterval: 1 }
      );

      expect(result.status).toBe("completed");
    });

    it("should throw AgentMonitorSnapshotFailedError when the snapshot fails", async () => {
      const failed: AgentMonitorSnapshot = {
        ...snapshotBase,
        status: "failed",
        error: "newsfeed unavailable",
      };

      const snapshotsClient = getProtectedClient(
        exa.beta.agent.monitors.snapshots
      );
      vi.spyOn(snapshotsClient, "request")
        .mockResolvedValueOnce(runningSnapshot)
        .mockResolvedValueOnce(failed);

      await expect(
        exa.beta.agent.monitors.snapshots.createAndWait(
          { ...snapshotParams, betas: BETAS },
          { pollInterval: 1 }
        )
      ).rejects.toThrow(AgentMonitorSnapshotFailedError);
    });

    it("should time out pollUntilFinished when the snapshot never finishes", async () => {
      const snapshotsClient = getProtectedClient(
        exa.beta.agent.monitors.snapshots
      );
      vi.spyOn(snapshotsClient, "request").mockResolvedValue(runningSnapshot);

      await expect(
        exa.beta.agent.monitors.snapshots.pollUntilFinished(
          "agentsnap_01hzx3snap1",
          {
            betas: BETAS,
            pollInterval: 1,
            timeoutMs: 5,
          }
        )
      ).rejects.toThrow(/Polling timeout/);
    });
  });
});
