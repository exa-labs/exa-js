/**
 * Exclude Example
 *
 * This example shows how to exclude existing websets and imports when creating
 * a new webset to avoid finding duplicate results.
 */

import * as dotenv from "dotenv";
import Exa, { CreateWebsetParametersSearchExcludeSource } from "../../src";

// Load environment variables from .env file
dotenv.config();

async function main() {
  // Initialize the Exa client
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) {
    console.log("Please set EXA_API_KEY environment variable");
    console.log("Example: export EXA_API_KEY='your-api-key-here'");
    process.exit(1);
  }

  const exa = new Exa(apiKey);

  try {
    // First, create a webset with some AI companies
    console.log("Creating initial webset with AI companies...");
    const knownCompaniesWebset = await exa.websets.create({
      search: {
        query: "companies based in SF building foundational AI models",
        count: 3,
      },
    });

    console.log(`✓ Created known companies webset: ${knownCompaniesWebset.id}`);
    console.log("Waiting for webset to complete...");
    await exa.websets.waitUntilIdle(knownCompaniesWebset.id);

    // Get the companies we found
    const knownItems = await exa.websets.items.list(knownCompaniesWebset.id);
    console.log(`\nKnown companies (${knownItems.data.length} found):`);
    knownItems.data.forEach((item, i) => {
      console.log(
        `  ${i + 1}. ${item.properties.url} - ${item.properties.description}`
      );
    });

    // Create a new webset with the same query but exclude the known companies
    console.log(
      "\nCreating new webset with same query but excluding known companies..."
    );
    const newWebset = await exa.websets.create({
      search: {
        query: "companies based in SF building foundational AI models", // Same query!
        count: 5,
        exclude: [
          {
            source: CreateWebsetParametersSearchExcludeSource.webset,
            id: knownCompaniesWebset.id,
          },
        ],
      },
    });

    console.log(`✓ Created new webset: ${newWebset.id}`);
    console.log("Waiting for new webset to complete...");
    await exa.websets.waitUntilIdle(newWebset.id);

    // Get the new results (should not include the excluded companies)
    const newItems = await exa.websets.items.list(newWebset.id);
    console.log(`\nNew companies found (${newItems.data.length} total):`);
    newItems.data.forEach((item, i) => {
      console.log(
        `  ${i + 1}. ${item.properties.url} - ${item.properties.description}`
      );
    });

    console.log(
      `\n✓ Successfully excluded ${knownItems.data.length} known companies from search`
    );

    // Clean up
    console.log("\nCleaning up...");
    await exa.websets.delete(knownCompaniesWebset.id);
    await exa.websets.delete(newWebset.id);
    console.log("✓ Cleaned up successfully");
  } catch (error) {
    console.error("Error in exclude example:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export default main;
