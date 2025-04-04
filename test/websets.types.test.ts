import { describe, expect, it } from "vitest";
import {
  CanceledReason,
  Event,
  WebsetEnrichmentFormat,
  WebsetSearchBehaviour,
  WebsetSearchStatus,
  WebsetStatus,
  WebhookStatus,
  Satisfied,
  Source,
  QueryParams
} from "../src/websets";

/**
 * These tests validate the enum values and types
 */
describe("Websets API Types", () => {
  it("should have correct status enum values", () => {
    expect(WebsetStatus.IDLE).toBe("idle");
    expect(WebsetStatus.RUNNING).toBe("running");
    expect(WebsetStatus.PAUSED).toBe("paused");
    
    expect(WebsetSearchStatus.CREATED).toBe("created");
    expect(WebsetSearchStatus.RUNNING).toBe("running");
    expect(WebsetSearchStatus.COMPLETED).toBe("completed");
    expect(WebsetSearchStatus.CANCELED).toBe("canceled");
    
    expect(WebsetSearchBehaviour.OVERRIDE).toBe("override");
    
    expect(WebhookStatus.ACTIVE).toBe("active");
    expect(WebhookStatus.INACTIVE).toBe("inactive");
  });
  
  it("should have correct format enum values", () => {
    expect(WebsetEnrichmentFormat.TEXT).toBe("text");
    expect(WebsetEnrichmentFormat.DATE).toBe("date");
    expect(WebsetEnrichmentFormat.NUMBER).toBe("number");
    expect(WebsetEnrichmentFormat.OPTIONS).toBe("options");
    expect(WebsetEnrichmentFormat.EMAIL).toBe("email");
    expect(WebsetEnrichmentFormat.PHONE).toBe("phone");
  });
  
  it("should have correct cancellation reason enum values", () => {
    expect(CanceledReason.WEBSET_DELETED).toBe("webset_deleted");
    expect(CanceledReason.WEBSET_CANCELED).toBe("webset_canceled");
  });
  
  it("should have correct source enum values", () => {
    expect(Source.SEARCH).toBe("search");
  });
  
  it("should have correct satisfied enum values", () => {
    expect(Satisfied.YES).toBe("yes");
    expect(Satisfied.NO).toBe("no");
    expect(Satisfied.UNCLEAR).toBe("unclear");
  });
  
  it("should have proper event enum values", () => {
    expect(Event.WEBSET_CREATED).toBe("webset.created");
    expect(Event.WEBSET_DELETED).toBe("webset.deleted");
    expect(Event.WEBSET_PAUSED).toBe("webset.paused");
    expect(Event.WEBSET_IDLE).toBe("webset.idle");
    expect(Event.WEBSET_SEARCH_CREATED).toBe("webset.search.created");
    expect(Event.WEBSET_SEARCH_CANCELED).toBe("webset.search.canceled");
    expect(Event.WEBSET_SEARCH_COMPLETED).toBe("webset.search.completed");
    expect(Event.WEBSET_SEARCH_UPDATED).toBe("webset.search.updated");
    expect(Event.WEBSET_EXPORT_CREATED).toBe("webset.export.created");
    expect(Event.WEBSET_EXPORT_COMPLETED).toBe("webset.export.completed");
    expect(Event.WEBSET_ITEM_CREATED).toBe("webset.item.created");
    expect(Event.WEBSET_ITEM_ENRICHED).toBe("webset.item.enriched");
  });
  
  it("should have correct QueryParams type behavior", () => {
    const params: QueryParams = {
      cursor: "test-cursor",
      limit: 10,
      expand: ["items"],
      filterBy: true,
      sort: "asc"
    };
    
    expect(params.cursor).toBe("test-cursor");
    expect(params.limit).toBe(10);
    expect(params.expand).toEqual(["items"]);
    expect(params.filterBy).toBe(true);
    expect(params.sort).toBe("asc");
  });
});