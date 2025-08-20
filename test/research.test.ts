import { beforeEach, describe, expect, it, vi } from "vitest";
import Exa from "../src";

/**
 * Test suite for the /research/v1 endpoint.
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
    const model = "exa-research";

    const schema = { type: "object" };

    const mockResponse = {
      researchId: "research_123",
      status: "running",
      instructions,
      model,
      createdAt: Date.now(),
    };

    const requestSpy = vi
      .spyOn(exa, "request")
      .mockResolvedValueOnce(mockResponse);

    const result = await exa.research.create({
      instructions,
      model,
      outputSchema: schema,
    });

    expect(requestSpy).toHaveBeenCalledWith(
      "/research/v1",
      "POST",
      {
        instructions,
        model,
        outputSchema: schema,
      },
      undefined
    );
    expect(result).toEqual(mockResponse);
  });

  it("should submit a research request with an explicit output schema", async () => {
    const instructions = "Explain photosynthesis in simple terms.";

    const schema = {
      type: "object",
      required: ["answer"],
      properties: {
        answer: { type: "string" },
      },
    };

    const mockResponse = {
      researchId: "research_456",
      status: "completed",
      instructions,
      model: "exa-research",
      createdAt: Date.now(),
      output: {
        content: "Photosynthesis is ...",
        parsed: { answer: "Photosynthesis is ..." },
      },
      costDollars: {
        numPages: 5,
        numSearches: 2,
        reasoningTokens: 1000,
        total: 0.05,
      },
      events: [],
    };

    const requestSpy = vi
      .spyOn(exa, "request")
      .mockResolvedValueOnce(mockResponse);

    const result = await exa.research.create({
      instructions,
      outputSchema: schema,
    });

    expect(requestSpy).toHaveBeenCalledWith(
      "/research/v1",
      "POST",
      {
        instructions,
        model: "exa-research",
        outputSchema: schema,
      },
      undefined
    );
    expect(result).toEqual(mockResponse);
  });

  it("should list research requests without options", async () => {
    const mockResponse = {
      data: [],
      hasMore: false,
      nextCursor: null,
    };

    const requestSpy = vi
      .spyOn(exa, "request")
      .mockResolvedValueOnce(mockResponse);

    const result = await exa.research.list();

    expect(requestSpy).toHaveBeenCalledWith(
      "/research/v1",
      "GET",
      undefined,
      {}
    );
    expect(result).toEqual(mockResponse);
  });

  it("should list research requests with pagination options", async () => {
    const pagination = { cursor: "abc123", limit: 25 } as const;

    const mockResponse = {
      data: [],
      hasMore: true,
      nextCursor: "def456",
    };

    const requestSpy = vi
      .spyOn(exa, "request")
      .mockResolvedValueOnce(mockResponse);

    const result = await exa.research.list(pagination);

    expect(requestSpy).toHaveBeenCalledWith(
      "/research/v1",
      "GET",
      undefined,
      pagination
    );
    expect(result).toEqual(mockResponse);
  });
});
