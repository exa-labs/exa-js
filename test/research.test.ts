import { beforeEach, describe, expect, it, vi } from "vitest";
import Exa, { ResearchStatus, type JSONSchema } from "../src";

/**
 * Test suite for the simplified /research endpoint.
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

  it("should submit a research request with query only", async () => {
    const query = "What is quantum computing?";

    const mockResponse = {
      id: "research_123",
      status: ResearchStatus.running,
      output: null,
      citations: [],
    };

    const requestSpy = vi
      .spyOn(exa, "request")
      .mockResolvedValueOnce(mockResponse);

    const result = await exa.research(query);

    expect(requestSpy).toHaveBeenCalledWith("/research", "POST", { query });
    expect(result).toEqual(mockResponse);
  });

  it("should submit a research request with an output schema", async () => {
    const query = "Explain photosynthesis.";
    const outputSchema: JSONSchema = {
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
      citations: [],
    };

    const requestSpy = vi
      .spyOn(exa, "request")
      .mockResolvedValueOnce(mockResponse);

    const result = await exa.research(query, { outputSchema });

    expect(requestSpy).toHaveBeenCalledWith("/research", "POST", {
      query,
      outputSchema,
    });
    expect(result).toEqual(mockResponse);
  });
});
