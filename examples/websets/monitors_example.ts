/**
 * Basic Monitors Example
 *
 * This example shows how to use Monitors to automatically keep your Websets
 * updated with fresh data on a schedule.
 *
 * This example demonstrates:
 * 1. Creating a Webset with search parameters
 * 2. Waiting for the Webset to complete processing
 * 3. Viewing the initial results
 * 4. Creating a Monitor to automatically find new items
 * 5. Managing Monitor configurations
 */

import * as dotenv from "dotenv";
import Exa, {
  CreateMonitorParameters,
  CreateWebsetParameters,
  UpdateMonitorStatus,
  WebsetSearchBehavior,
} from "../../src";

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

  // Define search parameters that we'll use for both the initial webset and monitor
  const searchParams = {
    query: "AI startups that raised Series A funding",
    count: 10,
    criteria: [
      { description: "Company is an AI startup" },
      { description: "Company has raised Series A funding in the last week" },
    ],
    entity: { type: "company" as const },
  };

  try {
    // Create a Webset to test our search parameters
    console.log("Creating webset...");
    const createParams: CreateWebsetParameters = {
      search: searchParams,
    };

    const webset = await exa.websets.create(createParams);
    console.log(`✓ Created webset: https://websets.exa.ai/${webset.id}`);

    // Wait for the webset to complete
    console.log("Waiting for webset to complete...");
    await exa.websets.waitUntilIdle(webset.id, {
      timeout: 300000, // 5 minutes
      pollInterval: 2000, // Check every 2 seconds
      onPoll: (status) => {
        console.log(`  Current status: ${status}...`);
      },
    });

    // List the items to see what we found
    const itemsResponse = await exa.websets.items.list(webset.id);
    console.log(`✓ Webset found ${itemsResponse.data.length} items`);

    if (itemsResponse.data.length > 0) {
      console.log("Sample results:");
      // Show first 3 results
      for (const item of itemsResponse.data.slice(0, 3)) {
        console.log(`  - ${item.properties.description}`);
      }
    }

    // Create a Monitor using the same search parameters to keep finding new companies
    console.log("\nCreating monitor...");
    // Cron format: "minute hour day_of_month month day_of_week"
    // Examples:
    // "0 9 * * 1" = Every Monday at 9:00 AM
    // "0 14 * * *" = Every day at 2:00 PM
    // "0 9 1 * *" = First day of every month at 9:00 AM
    const monitorParams: CreateMonitorParameters = {
      websetId: webset.id,
      cadence: {
        cron: "0 9 * * 1", // Every Monday at 9:00 AM (weekly)
        timezone: "America/New_York",
      },
      behavior: {
        type: "search",
        config: {
          query: searchParams.query,
          criteria: searchParams.criteria,
          entity: searchParams.entity,
          count: searchParams.count,
          behavior: WebsetSearchBehavior.append, // Add new items to the webset
        },
      },
    };

    const monitor = await exa.websets.monitors.create(monitorParams);
    console.log(`✓ Created monitor: ${monitor.id}`);
    console.log(`  Status: ${monitor.status}`);
    console.log(`  Next run: ${monitor.nextRunAt || "Not scheduled"}`);

    // List all monitors for the webset
    console.log(`\nMonitors for webset ${webset.id}:`);
    const monitors = await exa.websets.monitors.list({ websetId: webset.id });
    for (const m of monitors.data) {
      console.log(`  - ${m.id}: ${m.behavior.type} monitor (${m.status})`);
    }

    // Demonstrate monitor runs functionality
    console.log(`\nMonitor runs for ${monitor.id}:`);
    const runs = await exa.websets.monitors.runs.list(monitor.id, { limit: 5 });
    if (runs.data.length > 0) {
      for (const run of runs.data) {
        console.log(`  - Run ${run.id}: ${run.status} (${run.type})`);
        console.log(`    Created: ${run.createdAt}`);
        if (run.completedAt) {
          console.log(`    Completed: ${run.completedAt}`);
        }
      }
    } else {
      console.log("  No runs yet (monitor will run on schedule)");
    }

    // Show how to update monitor status
    console.log("\nPausing the monitor...");
    const updatedMonitor = await exa.websets.monitors.update(monitor.id, {
      status: UpdateMonitorStatus.enabled,
    });
    console.log(`✓ Monitor status updated to: ${updatedMonitor.status}`);

    console.log("\n✓ Monitors example completed successfully!");
    console.log("\nNext steps:");
    console.log("- Your monitor will automatically run weekly at 9 AM EST");
    console.log(
      "- New AI startups matching your criteria will be added to the webset"
    );
    console.log("- You can monitor progress via webhook notifications");
    console.log(`- View your webset at: https://websets.exa.ai/${webset.id}`);
  } catch (error) {
    console.error("Error in monitors example:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export default main;
