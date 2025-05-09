import { beforeEach, describe, expect, it, vi } from "vitest";
import Exa, { ResearchStatus, type JSONSchema } from "../src";

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
    const input = {
      instructions: "General research",
      query: "What is quantum computing?",
    };

    // Minimal (but valid) JSON schema
    const schema: JSONSchema = { type: "object" };

    const mockResponse = {
      id: "research_123",
      status: "running", // string allowed by ResearchTaskResponse
      output: null,
      citations: [],
    };

    const requestSpy = vi
      .spyOn(exa, "request")
      .mockResolvedValueOnce(mockResponse);

    const result = await exa.researchTask(input, { schema });

    expect(requestSpy).toHaveBeenCalledWith("/research/tasks", "POST", {
      input,
      output: { schema },
    });
    expect(result).toEqual(mockResponse);
  });

  it("should submit a research request with an explicit output schema", async () => {
    const input = {
      instructions: "Explain photosynthesis in simple terms.",
      query: "Explain photosynthesis.",
    };

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
      citations: [],
    };

    const requestSpy = vi
      .spyOn(exa, "request")
      .mockResolvedValueOnce(mockResponse);

    const result = await exa.researchTask(input, { schema });

    expect(requestSpy).toHaveBeenCalledWith("/research/tasks", "POST", {
      input,
      output: {
        schema,
      },
    });
    expect(result).toEqual(mockResponse);
  });
});
