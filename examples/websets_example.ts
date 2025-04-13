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
 * 7. Monitor events
 * 8. Work with webhooks and webhook attempts
 * 9. Clean up resources
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
  // Initialize the client with the API key
  const exa = new Exa(process.env.EXA_API_KEY);

  console.log("Creating a new Webset...");
  const createParams: CreateWebsetParameters = {
    search: {
      query:
        "AI research labs that have published research in the last two years",
      count: 25,
    },
    enrichments: [
      {
        description: "Latest company funding round",
        format: CreateEnrichmentParametersFormat.number,
      },
      {
        description: "Primary focus area",
        format: CreateEnrichmentParametersFormat.options,
        options: [
          { label: "Language models" },
          { label: "Computer vision" },
          { label: "Robotics" },
          { label: "Multi-modal AI" },
          { label: "Other" },
        ],
      },
      {
        description:
          "Find the LinkedIn profile of the VP of engineering or similar role",
        format: CreateEnrichmentParametersFormat.text,
      },
    ],
  };

  const webset = await exa.websets.create(createParams);
  console.log(`Webset created with ID: ${webset.id}`);
  console.log(`Status: ${webset.status}`);

  console.log("Waiting for Webset to finish processing...");
  const idleWebset = await exa.websets.waitUntilIdle(webset.id, {
    timeout: 300000,
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

  console.log("\nGetting Webset with items expanded...");
  const expandedWebset = await exa.websets.get(webset.id, ["items"]);
  console.log(`Expanded Webset has ${expandedWebset.items?.length ?? 0} items`);

  console.log("\nListing recent events...");
  const events = await exa.websets.events.list({
    limit: 5,
    types: [
      EventType.webset_created,
      EventType.webset_idle,
      EventType.webset_item_created,
    ],
  });
  console.log(`Found ${events.data.length} recent events:`);
  for (const event of events.data) {
    console.log(`- ${event.type} at ${event.createdAt}`);
  }

  console.log("\nCreating a webhook...");
  const webhook = await exa.websets.webhooks.create({
    url: "https://example.com/webhook",
    events: [EventType.webset_idle, EventType.webset_item_created],
  });
  console.log(`Webhook created with ID: ${webhook.id}`);

  // If there are any webhook attempts, list them
  console.log("\nListing webhook attempts...");
  const attempts = await exa.websets.webhooks.listAttempts(webhook.id, {
    limit: 5,
  });
  console.log(`Found ${attempts.data.length} webhook attempts`);

  if (attempts.data.length > 0) {
    console.log("Recent webhook attempts:");
    for (const attempt of attempts.data) {
      console.log(
        `- ${attempt.eventType} at ${attempt.attemptedAt} (${attempt.successful ? "success" : "failed"})`
      );
      console.log(`  Status code: ${attempt.responseStatusCode}`);
    }
  }

  console.log("\nCleaning up resources...");
  await exa.websets.webhooks.delete(webhook.id);
  console.log("Webhook deleted successfully");
  await exa.websets.delete(webset.id);
  console.log("Webset deleted successfully");
}

main();
