import { describe, expect, it, vi } from "vitest";
import Exa from "../../src";
import { Response } from "../../src/responses";

function createMockResponse(): Response {
  return {
    id: "resp_agent_run_123",
    object: "response",
    created_at: 1778706660,
    completed_at: 1778706684,
    status: "completed",
    model: "agent",
    output_text: "Returned 1 company.",
    output: [
      {
        id: "msg_agent_run_123",
        type: "message",
        status: "completed",
        role: "assistant",
        content: [
          {
            type: "output_text",
            text: "Returned 1 company.",
            annotations: [],
          },
        ],
      },
    ],
    error: null,
    incomplete_details: null,
    instructions: null,
    previous_response_id: null,
    metadata: {},
    tools: [],
    tool_choice: "auto",
    parallel_tool_calls: true,
    temperature: 1,
    top_p: 1,
    reasoning: { effort: "minimal", summary: null },
    usage: null,
  };
}

describe("Responses API", () => {
  it("exposes Responses as a top-level namespace", () => {
    const exa = new Exa("test-api-key", "https://api.exa.ai");

    expect(exa.responses).toBeDefined();
  });

  it("creates an Agent response with default model and reasoning effort", async () => {
    const exa = new Exa("test-api-key", "https://api.exa.ai");
    const requestSpy = vi
      .spyOn(exa, "request")
      .mockResolvedValueOnce(createMockResponse());

    const response = await exa.responses.create({
      input: "Find recent funding rounds.",
      reasoning: { effort: "minimal" },
      temperature: 0,
      tools: [{ type: "function", name: "ignored_tool" }],
    });

    expect(response.output_text).toBe("Returned 1 company.");
    expect(requestSpy).toHaveBeenCalledWith("/v1/responses", "POST", {
      input: "Find recent funding rounds.",
      model: "agent",
      reasoning: { effort: "minimal" },
      temperature: 0,
      tools: [{ type: "function", name: "ignored_tool" }],
    });
  });

  it("rejects streaming Responses requests until streaming is supported", async () => {
    const exa = new Exa("test-api-key", "https://api.exa.ai");
    const requestSpy = vi.spyOn(exa, "request");

    await expect(
      exa.responses.create({
        input: "Find recent funding rounds.",
        stream: true as false,
      })
    ).rejects.toThrow("Streaming Responses");
    expect(requestSpy).not.toHaveBeenCalled();
  });
});
