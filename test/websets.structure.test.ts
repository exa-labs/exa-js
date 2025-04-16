import { describe, expect, it } from "vitest";
import { Exa } from "../src";
import {
  WebsetEnrichmentsClient,
  WebsetItemsClient,
  WebsetsClient,
  WebsetSearchesClient,
  WebsetWebhooksClient,
} from "../src/websets";

describe("Websets API Structure", () => {
  const mockExa = {} as Exa;

  it("should have the main client with appropriate methods", () => {
    const client = new WebsetsClient(mockExa);

    expect(typeof client.create).toBe("function");
    expect(typeof client.get).toBe("function");
    expect(typeof client.list).toBe("function");
    expect(typeof client.update).toBe("function");
    expect(typeof client.delete).toBe("function");
    expect(typeof client.cancel).toBe("function");
    expect(typeof client.waitUntilIdle).toBe("function");

    expect(client.items).toBeInstanceOf(WebsetItemsClient);
    expect(client.searches).toBeInstanceOf(WebsetSearchesClient);
    expect(client.enrichments).toBeInstanceOf(WebsetEnrichmentsClient);
    expect(client.webhooks).toBeInstanceOf(WebsetWebhooksClient);
  });

  it("should have the items client with appropriate methods", () => {
    const client = new WebsetItemsClient(mockExa);

    expect(typeof client.list).toBe("function");
    expect(typeof client.listAll).toBe("function");
    expect(typeof client.get).toBe("function");
    expect(typeof client.delete).toBe("function");
  });

  it("should have the searches client with appropriate methods", () => {
    const client = new WebsetSearchesClient(mockExa);

    expect(typeof client.create).toBe("function");
    expect(typeof client.get).toBe("function");
    expect(typeof client.cancel).toBe("function");
  });

  it("should have the enrichments client with appropriate methods", () => {
    const client = new WebsetEnrichmentsClient(mockExa);

    expect(typeof client.create).toBe("function");
    expect(typeof client.get).toBe("function");
    expect(typeof client.delete).toBe("function");
    expect(typeof client.cancel).toBe("function");
  });

  it("should have the webhooks client with appropriate methods", () => {
    const client = new WebsetWebhooksClient(mockExa);

    expect(typeof client.create).toBe("function");
    expect(typeof client.get).toBe("function");
    expect(typeof client.list).toBe("function");
    expect(typeof client.update).toBe("function");
    expect(typeof client.delete).toBe("function");
  });
});
