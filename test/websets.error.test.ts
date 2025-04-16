import { describe, expect, it, vi } from "vitest";
import Exa from "../src";
import { ExaError } from "../src/errors";
import { getProtectedClient } from "./helpers";

describe("Websets API Error Handling", () => {
  it("should properly handle structured API errors", async () => {
    // Create client with a fake API key (won't make real calls)
    const exa = new Exa("test-key");
    const websetsClient = getProtectedClient(exa.websets);

    // Create a mock API error with the proper structure
    const mockApiError = {
      statusCode: 404,
      message: "Cannot GET /websets/non-existent-id/itemss",
      timestamp: "2023-05-10T12:28:16.627Z",
      path: "/websets/non-existent-id/itemss",
    };

    // Mock the core client's request method to return a structured error
    vi.spyOn(exa, "request").mockImplementation(() => {
      throw new ExaError(
        mockApiError.message,
        mockApiError.statusCode,
        mockApiError.timestamp,
        mockApiError.path
      );
    });

    await expect(
      websetsClient.request("/v0/websets/non-existent-id/itemss", "GET")
    ).rejects.toMatchObject({
      statusCode: 404,
      message: "Cannot GET /websets/non-existent-id/itemss",
      path: "/websets/non-existent-id/itemss",
      timestamp: "2023-05-10T12:28:16.627Z",
    });

    await expect(
      websetsClient.request("/v0/websets/non-existent-id/itemss", "GET")
    ).rejects.toBeInstanceOf(ExaError);
  });
});
