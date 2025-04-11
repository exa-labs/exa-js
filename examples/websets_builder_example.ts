/**
 * Example demonstrating the builder pattern for the Websets API
 *
 * This example shows how to use the builder classes to create complex
 * Webset objects in a more readable and maintainable way.
 */

import * as dotenv from "dotenv";
import Exa, { EventType, WebsetBuilder, WebsetSearchBuilder } from "../src";

// Load environment variables from .env file
dotenv.config();

async function main() {
  // Initialize the client
  const exa = new Exa(process.env.EXASEARCH_API_KEY);

  console.log("Creating a Webset using the builder pattern...");

  // 1. Build the search parameters first
  const searchBuilder = new WebsetSearchBuilder("AI research labs", 20)
    .forCompanies()
    .withCriteria([
      "Must focus on large language models research",
      "Must have published research in the last two years",
    ]);

  // 2. Build the Webset parameters, passing the SearchBuilder
  const websetParams = new WebsetBuilder(searchBuilder)
    .withNumberEnrichment("Estimate the company's founding year")
    .withOptionsEnrichment("Primary focus area", [
      "Language models",
      "Computer vision",
      "Robotics",
      "Multi-modal AI",
      "Other",
    ])
    .withEmailEnrichment("Extract the contact email for the research lab")
    .withPhoneEnrichment("Find the phone number of the main office")
    .withMetadata({
      purpose: "Market research",
      created_by: "builder-example",
      category: "AI Research",
    })
    .build();

  console.log(
    "Built Webset parameters:",
    JSON.stringify(websetParams, null, 2)
  );

  const webset = await exa.websets.create(websetParams);
  console.log(`Created Webset with ID: ${webset.id}`);

  // Wait for the Webset to be idle
  console.log("Waiting for Webset to be idle...");
  await exa.websets.waitUntilIdle(webset.id, {
    timeout: 300000,
    onPoll: (currentStatus) => console.log(`Current status: ${currentStatus}`),
  });

  // Add another search using the builder
  console.log("Adding another search to the Webset...");
  const newSearchBuilder = new WebsetSearchBuilder(
    "AI research labs in Europe",
    3
  )
    .forCompanies()
    .withCriterion("Must be headquartered in Europe")
    .shouldOverride();

  const searchParams = newSearchBuilder.build();

  console.log(
    "Built search parameters:",
    JSON.stringify(searchParams, null, 2)
  );

  const search = await exa.websets.searches.create(webset.id, searchParams);
  console.log(`Created search with ID: ${search.id}`);

  // Wait for the Webset to be idle again
  console.log("Waiting for Webset to be idle again...");
  await exa.websets.waitUntilIdle(webset.id, {
    timeout: 60000,
    onPoll: (currentStatus) => console.log(`Current status: ${currentStatus}`),
  });

  // Get all items at once
  console.log("Getting all items...");
  const items = await exa.websets.items.getAll(webset.id);
  console.log(`Found ${items.length} items in the Webset`);

  // Monitor events related to our Webset
  console.log("\nMonitoring events for our Webset...");
  const events = await exa.websets.events.list({
    limit: 10,
    types: [
      EventType.webset_created,
      EventType.webset_idle,
      EventType.webset_item_created,
      EventType.webset_search_created,
      EventType.webset_search_completed,
    ],
  });

  console.log(`Found ${events.data.length} events:`);
  for (const event of events.data) {
    console.log(`- ${event.type} at ${event.createdAt}`);
    if (
      event.type === EventType.webset_created ||
      event.type === EventType.webset_idle
    ) {
      console.log(`  Webset ID: ${event.data.id}`);
    } else if (event.type === EventType.webset_item_created) {
      console.log(`  Item ID: ${event.data.id}`);
    } else if (
      event.type === EventType.webset_search_created ||
      event.type === EventType.webset_search_completed
    ) {
      console.log(`  Search ID: ${event.data.id}`);
    }
  }
}

main();
