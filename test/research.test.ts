import { beforeEach, describe, expect, it, vi } from "vitest";
import Exa, { ResearchStatus, type JSONSchema } from "../src";
import { ResearchCreateTaskRequestDtoModel as ResearchModel } from "../src/research/openapi";

/**
 * Test suite for the /research endpoint.
 *
 * These tests only ensure that the Exa client constructs the correct
 * internal request payload. They do **not** make any real HTTP calls.
 */

describe("Research API", () => {
  let exa: Exa;

  beforeEach(() => {
    vi.resetAllMocks();
    exa = new Exa("test-api-key", "https://api.exa.ai");
  });

  it("should submit a research request with a minimal schema", async () => {
    const instructions = "General research";
    const model = ResearchModel.exa_research;

    // Minimal (but valid) JSON schema
    const schema: JSONSchema = { type: "object" };

    const mockResponse = {
      id: "research_123",
      status: "running", // string allowed by ResearchTaskResponse
      output: null,
      citations: {},
    };

    const requestSpy = vi
      .spyOn(exa, "request")
      .mockResolvedValueOnce(mockResponse);

    const result = await exa.research.createTask({
      instructions,
      model,
      output: { schema },
    });

    expect(requestSpy).toHaveBeenCalledWith(
      "/research/v0/tasks",
      "POST",
      {
        instructions,
        model,
        output: { schema },
      },
      undefined
    );
    expect(result).toEqual(mockResponse);
  });

  it("should submit a research request with an explicit output schema", async () => {
    const instructions = "Explain photosynthesis in simple terms.";

    const schema: JSONSchema = {
      type: "object",
      required: ["answer"],
      properties: {
        answer: { type: "string" },
      },
    };

    const mockResponse = {
      id: "research_456",
      status: ResearchStatus.completed,
      output: { answer: "Photosynthesis is ..." },
      citations: {},
    };

    const requestSpy = vi
      .spyOn(exa, "request")
      .mockResolvedValueOnce(mockResponse);

    const result = await exa.research.createTask({
      instructions,
      output: { schema },
    });

    expect(requestSpy).toHaveBeenCalledWith(
      "/research/v0/tasks",
      "POST",
      {
        instructions,
        model: ResearchModel.exa_research,
        output: {
          schema,
        },
      },
      undefined
    );
    expect(result).toEqual(mockResponse);
  });

  it("should list research tasks without options", async () => {
    const mockResponse = {
      data: [],
      hasMore: false,
      nextCursor: null,
    };

    const requestSpy = vi
      .spyOn(exa, "request")
      .mockResolvedValueOnce(mockResponse);

    const result = await exa.research.listTasks();

    expect(requestSpy).toHaveBeenCalledWith(
      "/research/v0/tasks",
      "GET",
      undefined,
      {}
    );
    expect(result).toEqual(mockResponse);
  });

  it("should list research tasks with pagination options", async () => {
    const pagination = { cursor: "abc123", limit: 25 } as const;

    const mockResponse = {
      data: [],
      hasMore: true,
      nextCursor: "def456",
    };

    const requestSpy = vi
      .spyOn(exa, "request")
      .mockResolvedValueOnce(mockResponse);

    const result = await exa.research.listTasks(pagination);

    expect(requestSpy).toHaveBeenCalledWith(
      "/research/v0/tasks",
      "GET",
      undefined,
      pagination
    );
    expect(result).toEqual(mockResponse);
  });
});
