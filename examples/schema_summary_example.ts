import Exa, { JSONSchema } from "../src/index";

const exa = new Exa(process.env.EXA_API_KEY);

async function runSchemaSummaryExample() {
  try {
    // Define a JSON schema for structured company information.
    const companySchema: JSONSchema = {
      $schema: "http://json-schema.org/draft-07/schema#",
      title: "Company Information",
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "The name of the company",
        },
        industry: {
          type: "string",
          description: "The industry the company operates in",
        },
        foundedYear: {
          type: "integer",
          description: "The year the company was founded",
        },
        keyProducts: {
          type: "array",
          items: {
            type: "string",
          },
          description:
            "List of key products or services offered by the company",
        },
        competitors: {
          type: "array",
          items: {
            type: "string",
          },
          description: "List of main competitors",
        },
      },
      required: ["name", "industry"],
    };

    // Search and get structured summary using the schema.
    console.log("Searching for company information with structured schema...");
    const searchResponse = await exa.searchAndContents(
      "OpenAI company information",
      {
        summary: {
          schema: companySchema,
        },
        category: "company",
        numResults: 3,
      }
    );

    // Log the search results.
    console.log("\nStructured summaries:");
    searchResponse.results.forEach((result, index) => {
      console.log(`\nResult ${index + 1}: ${result.title}`);
      console.log(`URL: ${result.url}`);

      if (result.summary) {
        // Attempt to parse the summary as JSON.
        try {
          const structuredData = JSON.parse(result.summary);
          console.log(
            "Structured data:",
            JSON.stringify(structuredData, null, 2)
          );
        } catch (e) {
          console.log("Summary (not structured):", result.summary);
        }
      } else {
        console.log("No summary available");
      }
    });
  } catch (error) {
    console.error("Error in schema summary example:", error);
  }
}

runSchemaSummaryExample();
