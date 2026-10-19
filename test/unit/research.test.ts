import { beforeEach, describe, expect, it, vi } from "vitest";
import Exa from "../../src";
import { ExaError } from "../../src/errors";
import { RESEARCH_RETIRED_MESSAGE } from "../../src/research/base";

/**
 * The Research API has been retired: every method rejects at once, without
 * sending a request.
 */
describe("Research API", () => {
  let exa: Exa;

  beforeEach(() => {
    vi.restoreAllMocks();
    exa = new Exa("test-api-key", "https://api.exa.ai");
  });

  it("names the replacement in its message", () => {
    expect(RESEARCH_RETIRED_MESSAGE).toContain("retired");
    expect(RESEARCH_RETIRED_MESSAGE).toContain("exa.agent.runs.create");
  });

  it.each([
    ["create", (exa: Exa) => exa.research.create({ instructions: "test" })],
    ["get", (exa: Exa) => exa.research.get("research_1")],
    [
      "get with stream",
      (exa: Exa) => exa.research.get("research_1", { stream: true }),
    ],
    ["list", (exa: Exa) => exa.research.list()],
    [
      "pollUntilFinished",
      (exa: Exa) =>
        exa.research.pollUntilFinished("research_1", { pollInterval: 60_000 }),
    ],
  ])("%s rejects without sending a request", async (_name, call) => {
    const request = vi.spyOn(exa, "request");
    const rawRequest = vi.spyOn(exa, "rawRequest");

    const error = await call(exa).then(
      () => undefined,
      (rejection: unknown) => rejection
    );

    expect(error).toBeInstanceOf(ExaError);
    expect(error).toMatchObject({
      message: RESEARCH_RETIRED_MESSAGE,
      statusCode: 410,
    });
    expect(request).not.toHaveBeenCalled();
    expect(rawRequest).not.toHaveBeenCalled();
  });
});
