import { it, expect } from "vitest";
import { createClient, integrationDescribe } from "./environment";

const exa = createClient();

integrationDescribe("Search Contents Options", () => {
  const testQuery = "invasive ant species California";

  it("Defaults to providing text contents with 10,000 max characters", async () => {
    const response = await exa.search(testQuery);
    expect(response.results).not.toHaveLength(0);

    const sampleResult = response.results[0];
    expect(sampleResult.text).toBeDefined();
    expect(sampleResult.text.length).toBeGreaterThan(1_000);
    expect(sampleResult.text.length).toBeLessThanOrEqual(10_000);
  });

  it("Returns no contents when explicitly set to false", async () => {
    const response = await exa.search(testQuery, {
      contents: false,
      numResults: 2,
    });
    expect(response.results).not.toHaveLength(0);

    const sampleResult = response.results[0];
    expect("text" in sampleResult).toBeFalsy();
    expect("summary" in sampleResult).toBeFalsy();
  });

  it("Returns text contents when explicitly requested", async () => {
    const response = await exa.search(testQuery, {
      contents: { text: true },
      numResults: 2,
    });
    expect(response.results).not.toHaveLength(0);

    const sampleResult = response.results[0];
    expect(sampleResult.text).toBeDefined();
    expect(sampleResult.text.length).toBeGreaterThan(100);
  });

  it("Returns text contents with custom maxCharacters", async () => {
    const maxChars = 500;
    const response = await exa.search(testQuery, {
      contents: { text: { maxCharacters: maxChars } },
      numResults: 2,
    });
    expect(response.results).not.toHaveLength(0);

    const sampleResult = response.results[0];
    expect(sampleResult.text).toBeDefined();
    expect(sampleResult.text.length).toBeLessThanOrEqual(maxChars);
  });

  it("Returns summary when requested", async () => {
    const response = await exa.search(testQuery, {
      contents: { summary: true },
      numResults: 2,
    });
    expect(response.results).not.toHaveLength(0);

    const sampleResult = response.results[0];
    expect(sampleResult.summary).toBeDefined();
    expect(sampleResult.summary.length).toBeGreaterThan(10);
    expect("text" in sampleResult).toBeFalsy();
  }, 15000);

  it("Returns both text and summary when both are requested", async () => {
    const response = await exa.search(testQuery, {
      contents: {
        text: { maxCharacters: 1000 },
        summary: true,
      },
      numResults: 2,
    });
    expect(response.results).not.toHaveLength(0);

    const sampleResult = response.results[0];
    expect(sampleResult.text).toBeDefined();
    expect(sampleResult.text.length).toBeGreaterThan(100);
    expect(sampleResult.text.length).toBeLessThanOrEqual(1000);
    expect(sampleResult.summary).toBeDefined();
    expect(sampleResult.summary.length).toBeGreaterThan(10);
  }, 20000);

  it("Returns summary with custom query", async () => {
    const response = await exa.search(testQuery, {
      contents: {
        text: { maxCharacters: 100 },
        summary: { query: "What is the name of the species?" },
      },
      numResults: 2,
    });
    expect(response.results).not.toHaveLength(0);

    const sampleResult = response.results[0];
    expect(sampleResult.summary).toBeDefined();
    expect(sampleResult.summary.length).toBeGreaterThan(10);
  }, 15000);

  it("Defaults to text when passing other search options without contents", async () => {
    const response = await exa.search(testQuery, {
      numResults: 3,
      type: "fast",
    });
    expect(response.results).toHaveLength(3);

    const sampleResult = response.results[0];
    expect(sampleResult.text).toBeDefined();
    expect(sampleResult.text.length).toBeGreaterThan(100);
  });
});

integrationDescribe("Company Category Search", () => {
  it("should return entities for company category search", async () => {
    const response = await exa.search("Exa AI search company", {
      category: "company",
      numResults: 5,
      contents: false,
    });

    expect(response.results).not.toHaveLength(0);

    // Find a result with entities
    const resultWithEntities = response.results.find(
      (r) => r.entities && r.entities.length > 0
    );

    expect(resultWithEntities).toBeDefined();
    expect(resultWithEntities!.entities).toBeDefined();
    expect(resultWithEntities!.entities!.length).toBeGreaterThan(0);

    // Verify entity structure
    const entity = resultWithEntities!.entities![0];
    expect(entity.type).toBe("company");
    expect(entity.id).toBeDefined();
    expect(entity.version).toBeDefined();
    expect(entity.properties).toBeDefined();

    // Company entity should have company properties
    if (entity.type === "company") {
      expect(entity.properties).toHaveProperty("name");
    }
  }, 15000);
});

integrationDescribe("People Category Search", () => {
  it("should return work history date ranges for people category search", async () => {
    const response = await exa.search("software engineer at Exa AI", {
      category: "people",
      numResults: 5,
      contents: false,
    });

    const people = response.results
      .flatMap((r) => r.entities ?? [])
      .filter((entity) => entity.type === "person");
    expect(people.length).toBeGreaterThan(0);

    const dates = people.flatMap((person) =>
      person.type === "person"
        ? (person.properties.workHistory ?? []).flatMap((entry) =>
            entry.dates ? [entry.dates] : []
          )
        : []
    );
    expect(dates.length).toBeGreaterThan(0);
    // A current role has no end date, so only some ranges carry `to`.
    expect(dates.every((range) => typeof range.from === "string")).toBe(true);
    expect(dates.some((range) => typeof range.to === "string")).toBe(true);
  }, 15000);
});
