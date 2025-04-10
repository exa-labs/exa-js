/**
 * Example demonstrating usage of the Websets API
 *
 * This example shows how to:
 * 1. Create a new Webset
 * 2. Check its status and wait until it's idle
 * 3. List and filter items in the Webset
 * 4. Add an enrichment
 * 5. Update Webset metadata
 * 6. Use advanced pagination features
 * 7. Work with webhooks
 * 8. Clean up resources
 */

import * as dotenv from "dotenv";
import Exa, {
  CreateEnrichmentParameters,
  CreateEnrichmentParametersFormat,
  CreateWebsetParameters,
  EventType,
} from "../src";

// Load environment variables from .env file
dotenv.config();

async function main() {
  // Initialize the client
  const exa = new Exa(process.env.EXASEARCH_API_KEY);

  try {
    console.log("Creating a new Webset...");
    const createParams: CreateWebsetParameters = {
      search: {
        query: "Top AI research labs focusing on large language models",
        count: 5,
        entity: { type: "company" },
      },
      metadata: {
        purpose: "Research on AI labs",
        created_by: "exa-js example",
      },
    };

    const webset = await exa.websets.create(createParams);
    console.log(`Webset created with ID: ${webset.id}`);
    console.log(`Status: ${webset.status}`);

    console.log("Waiting for Webset to finish processing...");
    const idleWebset = await exa.websets.waitUntilIdle(webset.id, {
      timeout: 60000,
      pollInterval: 2000,
      onPoll: (status) => {
        console.log(`Current status: ${status}...`);
      },
    });
    console.log(`Webset processing complete. Status: ${idleWebset.status}`);

    console.log("Listing Webset items...");
    const items = await exa.websets.items.list(webset.id, { limit: 10 });
    console.log(`Found ${items.data.length} items:`);
    for (const item of items.data) {
      console.log(
        `- ${
          item.properties.type === "company"
            ? item.properties.company.name
            : "Unknown"
        }: ${item.properties.url}`
      );
    }

    console.log("\nCollecting all items at once:");
    const allItems = await exa.websets.items.getAll(webset.id);
    console.log(`Retrieved ${allItems.length} items in total`);

    console.log("\nAdding an enrichment...");
    const enrichmentParams: CreateEnrichmentParameters = {
      description: "Estimate the company's founding year",
      format: CreateEnrichmentParametersFormat.number,
      metadata: { purpose: "Timeline analysis" },
    };
    const enrichment = await exa.websets.enrichments.create(
      webset.id,
      enrichmentParams
    );
    console.log(`Enrichment created with ID: ${enrichment.id}`);

    console.log("\nUpdating Webset metadata...");
    await exa.websets.update(webset.id, {
      metadata: {
        // Ensure previous metadata exists before spreading
        ...(webset.metadata || {}),
        last_updated: new Date().toISOString(),
        stage: "enriched",
      },
    });
    console.log("Metadata updated");

    console.log("\nGetting Webset with items expanded...");
    const expandedWebset = await exa.websets.get(webset.id, ["items"]);
    console.log(
      `Expanded Webset has ${expandedWebset.items?.length ?? 0} items`
    );

    console.log("\nCreating a webhook...");
    const webhook = await exa.websets.webhooks.create({
      url: "https://example.com/webhook",
      events: [EventType.webset_idle, EventType.webset_item_created],
    });
    console.log(`Webhook created with ID: ${webhook.id}`);

    console.log("\nListing webhooks...");
    const webhooks = await exa.websets.webhooks.list();
    console.log(`Found ${webhooks.data.length} webhooks`);

    console.log("\nCleaning up resources...");
    await exa.websets.webhooks.delete(webhook.id);
    console.log("Webhook deleted successfully");
    await exa.websets.delete(webset.id);
    console.log("Webset deleted successfully");
  } catch (error) {
    console.error("Error:", error);
  }
}

main();
