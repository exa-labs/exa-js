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

import Exa, { 
  CreateWebsetParameters, 
  WebsetStatus, 
  CreateEnrichmentParameters,
  WebsetEnrichmentFormat,
  Event,
  WebhookStatus
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

    // 2. Wait until the Webset is idle with progress updates
    console.log("Waiting for Webset to finish processing...");
    
    // Using the enhanced waitUntilIdle with options
    const idleWebset = await exa.websets.waitUntilIdle(webset.id, {
      timeout: 60000, // 60 second timeout
      pollInterval: 2000, // Check every 2 seconds
      onPoll: (status) => {
        console.log(`Current status: ${status}...`);
      }
    });
    
    console.log(`Webset processing complete. Status: ${idleWebset.status}`);

    // 3. List items in the Webset with filtering
    console.log("Listing Webset items...");
    
    // Use the enhanced list method with options
    const items = await exa.websets.items.list(webset.id, {
      limit: 10
      // We could add filters like searchId or satisfiesCriteria here
    });
    
    console.log(`Found ${items.data.length} items:`);
    for (const item of items.data) {
      console.log(`- ${item.properties.type === "company" ? item.properties.company.name : "Unknown"}: ${item.properties.url}`);
    }

    // 4. Demonstrate using getAll to collect all items in one call
    console.log("\nCollecting all items at once:");
    const allItems = await exa.websets.items.getAll(webset.id);
    console.log(`Retrieved ${allItems.length} items in total`);

    // 5. Add an enrichment to extract additional information
    console.log("\nAdding an enrichment...");
    const enrichmentParams: CreateEnrichmentParameters = {
      description: "Estimate the company's founding year",
      format: WebsetEnrichmentFormat.NUMBER,
      metadata: {
        purpose: "Timeline analysis"
      }
    };
    
    const enrichment = await exa.websets.enrichments.create(webset.id, enrichmentParams);
    console.log(`Enrichment created with ID: ${enrichment.id}`);

    // 6. Update Webset metadata
    console.log("\nUpdating Webset metadata...");
    await exa.websets.update(webset.id, {
      metadata: {
        ...webset.metadata,
        last_updated: new Date().toISOString(),
        stage: "enriched"
      }
    });
    console.log("Metadata updated");

    // 7. Get the updated Webset with items expanded
    console.log("\nGetting Webset with items expanded...");
    const expandedWebset = await exa.websets.get(webset.id, ["items"]);
    console.log(`Expanded Webset has ${expandedWebset.items?.length ?? 0} items`);
    
    // 8. Create a webhook for notifications (just as an example)
    console.log("\nCreating a webhook...");
    const webhook = await exa.websets.webhooks.create({
      url: "https://example.com/webhook",
      events: [
        Event.WEBSET_IDLE,
        Event.WEBSET_ITEM_CREATED
      ]
    });
    console.log(`Webhook created with ID: ${webhook.id}`);
    
    // 9. List active webhooks
    console.log("\nListing active webhooks...");
    const activeWebhooks = await exa.websets.webhooks.list({
      status: WebhookStatus.ACTIVE
    });
    console.log(`Found ${activeWebhooks.data.length} active webhooks`);
    
    // 10. Clean up resources
    console.log("\nCleaning up resources...");
    
    // Delete the webhook
    await exa.websets.webhooks.delete(webhook.id);
    console.log("Webhook deleted successfully");
    
    // Delete the Webset
    await exa.websets.delete(webset.id);
    console.log("Webset deleted successfully");

  } catch (error) {
    console.error("Error:", error);
  }
}

main();