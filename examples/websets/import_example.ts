/**
 * Import Example
 *
 * This example shows how to create an import and upload CSV data to Websets.
 */

import * as dotenv from "dotenv";
import Exa, { CreateImportParametersFormat } from "../../src";

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
  const csvData = `company_name,website_url,location
Apple Inc,https://www.apple.com,Cupertino California
Google LLC,https://www.google.com,Mountain View California
OpenAI,https://openai.com,San Francisco California
Microsoft Corporation,https://www.microsoft.com,Redmond Washington
Meta Platforms,https://www.meta.com,Menlo Park California`;

  try {
    console.log("Creating import...");

    // Create an import for company data
    const importResponse = await exa.websets.imports.create({
      title: "Sample Company Data",
      format: CreateImportParametersFormat.csv,
      entity: { type: "company" },
      size: Math.ceil(Buffer.byteLength(csvData, "utf8") / (1024 * 1024)) || 1, // Size in MB, minimum 1
      count: 5,
    });

    console.log(`✓ Created import: ${importResponse.id}`);
    console.log(`  Upload URL valid until: ${importResponse.uploadValidUntil}`);

    // Upload the CSV data with proper S3 headers
    console.log("\nUploading CSV data...");
    const csvBuffer = Buffer.from(csvData, "utf8");

    const uploadResponse = await fetch(importResponse.uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Length": csvBuffer.length.toString(),
      },
      body: csvBuffer,
    });

    if (uploadResponse.ok) {
      console.log("✓ CSV data uploaded successfully");

      // Wait for the import to complete processing
      console.log("\nWaiting for import to complete...");
      try {
        const completedImport = await exa.websets.imports.waitUntilCompleted(
          importResponse.id,
          {
            timeout: 120000, // 2 minutes
            pollInterval: 3000, // Check every 3 seconds
            onPoll: (status) => {
              console.log(`  Current status: ${status}...`);
            },
          }
        );

        console.log(`✓ Import completed successfully!`);
        console.log(`  Final status: ${completedImport.status}`);
        console.log(`  Records processed: ${completedImport.count}`);
      } catch (error) {
        console.log(
          `✗ Import failed or timed out: ${(error as Error).message}`
        );
      }
    } else {
      const errorText = await uploadResponse.text();
      console.log(
        `✗ Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`
      );
      console.log(`Error details: ${errorText}`);

      // Continue with the rest of the example even if upload fails
      console.log("\nContinuing with other import operations...");
    }

    // List all imports to see our new one
    console.log("\nListing recent imports...");
    const importsList = await exa.websets.imports.list({ limit: 3 });
    console.log(`Found ${importsList.data.length} imports:`);
    for (const imp of importsList.data) {
      console.log(`  - ${imp.title} (${imp.id}): ${imp.status}`);
    }

    // Update the import metadata
    console.log("\nUpdating import metadata...");
    const updatedImport = await exa.websets.imports.update(importResponse.id, {
      title: "Updated Sample Company Data",
      metadata: {
        source: "api_example",
        description: "Updated sample companies for testing",
      },
    });
    console.log(`✓ Updated import title: ${updatedImport.title}`);

    // Clean up
    console.log("\nDeleting import...");
    await exa.websets.imports.delete(importResponse.id);
    console.log("✓ Import deleted");

    console.log("\n✓ Import example completed successfully!");
  } catch (error) {
    console.error("Error in import example:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export default main;
