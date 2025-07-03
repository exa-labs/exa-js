/**
 * Zod Summary Example for Exa
 *
 * This example demonstrates how to use Zod schemas with search and summary
 * to extract structured data from web content.
 */

import { Exa } from "../src";
import { z } from "zod";

const EXA_API_KEY = process.env.EXA_API_KEY;
const EXA_BASE_URL = process.env.EXA_BASE_URL;

const exa = new Exa(EXA_API_KEY, EXA_BASE_URL);

// ===============================================
// Zod Schemas for Structured Summaries
// ===============================================

const CompanyInformation = z.object({
  name: z.string().describe("The name of the company"),
  industry: z.string().describe("The industry the company operates in"),
  founded_year: z
    .number()
    .optional()
    .describe("The year the company was founded"),
  headquarters: z
    .string()
    .optional()
    .describe("Location of company headquarters"),
  key_products: z
    .array(z.string())
    .optional()
    .describe("List of key products or services"),
  market_cap: z
    .string()
    .optional()
    .describe("Market capitalization if available"),
  employee_count: z.string().optional().describe("Number of employees"),
});

const ResearchPaper = z.object({
  title: z.string().describe("Title of the research paper"),
  authors: z.array(z.string()).describe("List of paper authors"),
  publication_year: z.number().optional().describe("Year of publication"),
  journal: z.string().optional().describe("Journal or conference name"),
  abstract: z.string().describe("Abstract or summary of the paper"),
  key_findings: z
    .array(z.string())
    .optional()
    .describe("Main findings or contributions"),
  methodology: z.string().optional().describe("Research methodology used"),
});

const ProductInformation = z.object({
  name: z.string().describe("Product name"),
  manufacturer: z.string().describe("Company that makes the product"),
  category: z.string().describe("Product category"),
  price: z.string().optional().describe("Product price"),
  key_features: z
    .array(z.string())
    .optional()
    .describe("Main product features"),
  release_date: z.string().optional().describe("When the product was released"),
  target_audience: z
    .string()
    .optional()
    .describe("Who the product is designed for"),
});

const NewsEvent = z.object({
  headline: z.string().describe("Main headline of the news"),
  summary: z.string().describe("Brief summary of what happened"),
  key_points: z
    .array(z.string())
    .optional()
    .describe("Main points from the article"),
});

const StartupProfile = z.object({
  name: z.string().describe("Startup name"),
  industry: z.string().describe("Industry sector"),
  funding_stage: z.string().optional().describe("Current funding stage"),
  total_funding: z.string().optional().describe("Total funding raised"),
  founded_year: z.number().optional().describe("Year founded"),
  location: z.string().optional().describe("Headquarters location"),
  description: z.string().describe("Brief description of what they do"),
});

// ===============================================
// Example Functions
// ===============================================

async function extractCompanyData() {
  console.log("Example 1: Company Information Extraction");
  console.log("=".repeat(40));

  try {
    const response = await exa.searchAndContents(
      "news articles about AI companies",
      {
        summary: {
          schema: CompanyInformation,
        },
        category: "company",
        numResults: 5,
      }
    );

    response.results.forEach((result, index) => {
      console.log(`\nResult ${index + 1}: ${result.title}`);
      console.log(`URL: ${result.url}`);

      if (result.summary) {
        // TypeScript knows this is CompanyInformation type!
        const companyData = JSON.parse(result.summary) as z.infer<
          typeof CompanyInformation
        >;

        console.log(`Company: ${companyData.name}`);
        console.log(`Industry: ${companyData.industry}`);

        if (companyData.founded_year) {
          console.log(`Founded: ${companyData.founded_year}`);
        }

        if (companyData.headquarters) {
          console.log(`Headquarters: ${companyData.headquarters}`);
        }

        if (companyData.key_products) {
          console.log("Key Products:");
          companyData.key_products.forEach((product) =>
            console.log(`  • ${product}`)
          );
        }

        if (companyData.market_cap) {
          console.log(`Market Cap: ${companyData.market_cap}`);
        }

        if (companyData.employee_count) {
          console.log(`Employees: ${companyData.employee_count}`);
        }
      } else {
        console.log("No summary available");
      }
    });
  } catch (error) {
    console.error("Error in company data extraction:", error);
  }
}

async function extractResearchPapers() {
  console.log("\n\nExample 2: Research Paper Analysis");
  console.log("=".repeat(40));

  try {
    const response = await exa.searchAndContents(
      "transformer architecture attention mechanism research papers",
      {
        summary: {
          schema: ResearchPaper,
        },
        category: "research paper",
        numResults: 5,
      }
    );

    response.results.forEach((result, index) => {
      console.log(`\nResult ${index + 1}: ${result.title}`);
      console.log(`URL: ${result.url}`);

      if (result.summary) {
        // TypeScript knows this is ResearchPaper type!
        const paperData = JSON.parse(result.summary) as z.infer<
          typeof ResearchPaper
        >;

        console.log(`Title: ${paperData.title}`);

        if (paperData.authors.length > 0) {
          const authors = paperData.authors.slice(0, 3).join(", ");
          const moreAuthors =
            paperData.authors.length > 3
              ? ` (and ${paperData.authors.length - 3} others)`
              : "";
          console.log(`Authors: ${authors}${moreAuthors}`);
        }

        if (paperData.publication_year) {
          console.log(`Year: ${paperData.publication_year}`);
        }

        if (paperData.journal) {
          console.log(`Published in: ${paperData.journal}`);
        }

        console.log(`Abstract: ${paperData.abstract.substring(0, 200)}...`);

        if (paperData.key_findings) {
          console.log("Key Findings:");
          paperData.key_findings.forEach((finding) =>
            console.log(`  • ${finding}`)
          );
        }

        if (paperData.methodology) {
          console.log(`Methodology: ${paperData.methodology}`);
        }
      } else {
        console.log("No summary available");
      }
    });
  } catch (error) {
    console.error("Error in research paper extraction:", error);
  }
}

async function extractProductInfo() {
  console.log("\n\nExample 3: Product Information Extraction");
  console.log("=".repeat(40));

  try {
    const response = await exa.searchAndContents(
      "mechanical keyboards reviews",
      {
        summary: {
          schema: ProductInformation,
        },
        numResults: 5,
      }
    );

    response.results.forEach((result, index) => {
      console.log(`\nResult ${index + 1}: ${result.title}`);
      console.log(`URL: ${result.url}`);

      if (result.summary) {
        // TypeScript knows this is ProductInformation type!
        const productData = JSON.parse(result.summary) as z.infer<
          typeof ProductInformation
        >;

        console.log(`Product: ${productData.name}`);
        console.log(`Manufacturer: ${productData.manufacturer}`);
        console.log(`Category: ${productData.category}`);

        if (productData.price) {
          console.log(`Price: ${productData.price}`);
        }

        if (productData.key_features) {
          console.log("Key Features:");
          productData.key_features.forEach((feature) =>
            console.log(`  • ${feature}`)
          );
        }

        if (productData.release_date) {
          console.log(`Release Date: ${productData.release_date}`);
        }

        if (productData.target_audience) {
          console.log(`Target Audience: ${productData.target_audience}`);
        }
      } else {
        console.log("No summary available");
      }
    });
  } catch (error) {
    console.error("Error in product information extraction:", error);
  }
}

async function extractNewsEvents() {
  console.log("\n\nExample 4: News Event Extraction");
  console.log("=".repeat(40));

  try {
    const response = await exa.searchAndContents(
      "artificial intelligence breakthrough news",
      {
        summary: {
          schema: NewsEvent,
        },
        numResults: 5,
      }
    );

    response.results.forEach((result, index) => {
      console.log(`\nResult ${index + 1}: ${result.title}`);
      console.log(`URL: ${result.url}`);

      if (result.summary) {
        // TypeScript knows this is NewsEvent type!
        const newsData = JSON.parse(result.summary) as z.infer<
          typeof NewsEvent
        >;

        console.log(`Headline: ${newsData.headline}`);
        console.log(`Summary: ${newsData.summary}`);

        if (newsData.key_points) {
          console.log("Key Points:");
          newsData.key_points.forEach((point) => console.log(`  • ${point}`));
        }
      } else {
        console.log("No summary available");
      }
    });
  } catch (error) {
    console.error("Error in news event extraction:", error);
  }
}

async function extractStartupProfiles() {
  console.log("\n\nExample 5: Startup Profile Extraction");
  console.log("=".repeat(40));

  try {
    const response = await exa.searchAndContents(
      "fintech startup funding news",
      {
        summary: {
          schema: StartupProfile,
        },
        numResults: 5,
      }
    );

    response.results.forEach((result, index) => {
      console.log(`\nResult ${index + 1}: ${result.title}`);
      console.log(`URL: ${result.url}`);

      if (result.summary) {
        // TypeScript knows this is StartupProfile type!
        const startupData = JSON.parse(result.summary) as z.infer<
          typeof StartupProfile
        >;

        console.log(`Startup: ${startupData.name}`);
        console.log(`Industry: ${startupData.industry}`);
        console.log(`Description: ${startupData.description}`);

        if (startupData.funding_stage) {
          console.log(`Funding Stage: ${startupData.funding_stage}`);
        }

        if (startupData.total_funding) {
          console.log(`Total Funding: ${startupData.total_funding}`);
        }

        if (startupData.founded_year) {
          console.log(`Founded: ${startupData.founded_year}`);
        }

        if (startupData.location) {
          console.log(`Location: ${startupData.location}`);
        }
      } else {
        console.log("No summary available");
      }
    });
  } catch (error) {
    console.error("Error in startup profile extraction:", error);
  }
}

// ===============================================
// Main Function
// ===============================================

async function main() {
  console.log("🚀 Zod Summary Integration Examples\n");

  await extractCompanyData();
  await extractResearchPapers();
  await extractProductInfo();
  await extractNewsEvents();
  await extractStartupProfiles();

  console.log("\n✅ All summary examples completed!");
}

// Export schemas and functions for use in other examples
export {
  CompanyInformation,
  ResearchPaper,
  ProductInformation,
  NewsEvent,
  StartupProfile,
  main as runSummaryExamples,
};

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}
