/**
 * Example demonstrating usage of the Websets API
 * 
 * This example shows how to:
 * 1. Create a new Webset
 * 2. Check its status and wait until it's idle
 * 3. List items in the Webset
 * 4. Add an enrichment
 * 5. Update Webset metadata
 * 6. Delete a Webset
 */

import Exa, { 
  CreateWebsetParameters, 
  WebsetStatus, 
  CreateEnrichmentParameters,
  WebsetEnrichmentFormat
} from "../src";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

async function main() {
  // Initialize the client
  const exa = new Exa(process.env.EXASEARCH_API_KEY);

  try {
    // 1. Create a new Webset
    console.log("Creating a new Webset...");
    const createParams: CreateWebsetParameters = {
      search: {
        query: "Top AI research labs focusing on large language models",
        count: 5,
        entity: {
          type: "company"
        }
      },
      metadata: {
        purpose: "Research on AI labs",
        created_by: "exa-js example"
      }
    };

    const webset = await exa.websets.create(createParams);
    console.log(`Webset created with ID: ${webset.id}`);
    console.log(`Status: ${webset.status}`);

    // 2. Wait until the Webset is idle (processing complete)
    console.log("Waiting for Webset to finish processing...");
    const idleWebset = await exa.websets.waitUntilIdle(webset.id, 60000); // 60 second timeout
    console.log(`Webset processing complete. Status: ${idleWebset.status}`);

    // 3. List items in the Webset
    console.log("Listing Webset items...");
    const items = await exa.websets.items.list(webset.id);
    console.log(`Found ${items.data.length} items:`);
    for (const item of items.data) {
      console.log(`- ${item.properties.type === "company" ? item.properties.company.name : "Unknown"}: ${item.properties.url}`);
    }

    // 4. Add an enrichment to extract additional information
    console.log("Adding an enrichment...");
    const enrichmentParams: CreateEnrichmentParameters = {
      description: "Estimate the company's founding year",
      format: WebsetEnrichmentFormat.NUMBER,
      metadata: {
        purpose: "Timeline analysis"
      }
    };
    
    const enrichment = await exa.websets.enrichments.create(webset.id, enrichmentParams);
    console.log(`Enrichment created with ID: ${enrichment.id}`);

    // 5. Update Webset metadata
    console.log("Updating Webset metadata...");
    await exa.websets.update(webset.id, {
      metadata: {
        ...webset.metadata,
        last_updated: new Date().toISOString(),
        stage: "enriched"
      }
    });
    console.log("Metadata updated");

    // 6. Get the updated Webset with items expanded
    console.log("Getting Webset with items expanded...");
    const expandedWebset = await exa.websets.get(webset.id, ["items"]);
    console.log(`Expanded Webset has ${expandedWebset.items?.length ?? 0} items`);

    // 7. Delete the Webset
    console.log("Deleting Webset...");
    await exa.websets.delete(webset.id);
    console.log("Webset deleted successfully");

  } catch (error) {
    console.error("Error:", error);
  }
}

main();