/**
 * Import Example
 *
 * This example shows how to create an import and upload CSV data to Websets.
 */

import * as dotenv from "dotenv";
import Exa from "../../src";

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

  // Sample CSV data for companies
  const csv = `company_name,website_url,location
Apple Inc,https://www.apple.com,Cupertino California
Google LLC,https://www.google.com,Mountain View California
OpenAI,https://openai.com,San Francisco California
Microsoft Corporation,https://www.microsoft.com,Redmond Washington
Meta Platforms,https://www.meta.com,Menlo Park California`;

  try {
    console.log("Creating import with CSV data...");

    // Create import with CSV data directly
    const createdImport = await exa.websets.imports.create(
      {
        title: "Sample Company Data",
        entity: { type: "company" },
        metadata: {
          source: "api_example",
          description: "Sample companies for testing",
        },
      },
      csv
    );

    console.log(`✓ Import created and uploaded!`);
    console.log(`  ID: ${createdImport.id}`);
    console.log(`  Status: ${createdImport.status}`);

    // (Optional) Wait for processing to complete
    // This is useful if you want to make sure the import succeeds before proceeding
    // Though its not required, as the import will be processed in the background
    console.log("\nWaiting for import to complete...");
    const completedImport = await exa.websets.imports.waitUntilCompleted(
      createdImport.id,
      {
        timeout: 120000, // 2 minutes
        pollInterval: 3000, // Check every 3 seconds
        onPoll: (status) => {
          console.log(`  Status: ${status}`);
        },
      }
    );

    console.log(`✓ Import completed successfully!`);
    console.log(`  Records processed: ${completedImport.count}`);

    // Clean up
    console.log("\nCleaning up...");
    await exa.websets.imports.delete(completedImport.id);
    console.log("✓ Cleanup completed");
  } catch (error) {
    console.error("Error in import example:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export default main;
