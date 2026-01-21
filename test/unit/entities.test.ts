/**
 * Unit tests for Entity types in search results.
 *
 * Tests verify that entity data is correctly typed and structured
 * for company and person category searches.
 */

import { describe, expect, it } from "vitest";
import type {
  Entity,
  CompanyEntity,
  PersonEntity,
  SearchResult,
} from "../../src";

describe("Entity Types", () => {
  describe("CompanyEntity", () => {
    it("should correctly type a company entity with all properties", () => {
      const company: CompanyEntity = {
        id: "https://exa.ai/library/company/exa",
        type: "company",
        version: 1,
        properties: {
          name: "Exa",
          foundedYear: 2022,
          description: "AI-powered search engine",
          workforce: {
            total: 50,
          },
          headquarters: {
            address: "123 Main St",
            city: "San Francisco",
            postalCode: "94105",
            country: "US",
          },
          financials: {
            revenueAnnual: 10000000,
            fundingTotal: 50000000,
          },
        },
      };

      expect(company.type).toBe("company");
      expect(company.properties.name).toBe("Exa");
      expect(company.properties.workforce?.total).toBe(50);
      expect(company.properties.headquarters?.city).toBe("San Francisco");
      expect(company.properties.financials?.fundingTotal).toBe(50000000);
    });

    it("should allow nullable properties", () => {
      const company: CompanyEntity = {
        id: "https://exa.ai/library/company/unknown",
        type: "company",
        version: 1,
        properties: {
          name: "Unknown Corp",
          foundedYear: null,
          description: null,
          workforce: null,
          headquarters: null,
          financials: null,
        },
      };

      expect(company.properties.foundedYear).toBeNull();
      expect(company.properties.workforce).toBeNull();
    });
  });

  describe("PersonEntity", () => {
    it("should correctly type a person entity with work history", () => {
      const person: PersonEntity = {
        id: "https://exa.ai/library/person/john-doe",
        type: "person",
        version: 1,
        properties: {
          name: "John Doe",
          location: "San Francisco, CA",
          workHistory: [
            {
              title: "Software Engineer",
              location: "San Francisco, CA",
              dates: {
                from: "2020-01-15",
                to: "2023-06-30",
              },
              company: {
                id: "https://exa.ai/library/company/exa",
                name: "Exa",
              },
            },
            {
              title: "Junior Developer",
              location: "New York, NY",
              dates: {
                from: "2018-06-01",
                to: "2019-12-31",
              },
              company: {
                id: null,
                name: "Startup Inc",
              },
            },
          ],
        },
      };

      expect(person.type).toBe("person");
      expect(person.properties.name).toBe("John Doe");
      expect(person.properties.workHistory).toHaveLength(2);
      expect(person.properties.workHistory?.[0].title).toBe("Software Engineer");
      expect(person.properties.workHistory?.[0].company?.name).toBe("Exa");
    });

    it("should allow empty work history", () => {
      const person: PersonEntity = {
        id: "https://exa.ai/library/person/jane-doe",
        type: "person",
        version: 1,
        properties: {
          name: "Jane Doe",
          location: null,
          workHistory: [],
        },
      };

      expect(person.properties.workHistory).toHaveLength(0);
    });
  });

  describe("Entity Union Type", () => {
    it("should discriminate between company and person entities", () => {
      const entities: Entity[] = [
        {
          id: "https://exa.ai/library/company/exa",
          type: "company",
          version: 1,
          properties: {
            name: "Exa",
          },
        },
        {
          id: "https://exa.ai/library/person/john",
          type: "person",
          version: 1,
          properties: {
            name: "John",
          },
        },
      ];

      const companies = entities.filter((e): e is CompanyEntity => e.type === "company");
      const people = entities.filter((e): e is PersonEntity => e.type === "person");

      expect(companies).toHaveLength(1);
      expect(people).toHaveLength(1);
      expect(companies[0].properties.name).toBe("Exa");
      expect(people[0].properties.name).toBe("John");
    });
  });

  describe("SearchResult with Entities", () => {
    it("should include entities in search results", () => {
      const result: SearchResult<{}> = {
        title: "Exa - AI Search Engine",
        url: "https://exa.ai",
        id: "doc-123",
        entities: [
          {
            id: "https://exa.ai/library/company/exa",
            type: "company",
            version: 1,
            properties: {
              name: "Exa",
              foundedYear: 2022,
            },
          },
        ],
      };

      expect(result.entities).toBeDefined();
      expect(result.entities).toHaveLength(1);
      expect(result.entities?.[0].type).toBe("company");
    });

    it("should allow results without entities", () => {
      const result: SearchResult<{}> = {
        title: "Some Article",
        url: "https://example.com",
        id: "doc-456",
      };

      expect(result.entities).toBeUndefined();
    });
  });
});
