import "dotenv/config";
import { Exa } from "../src";

const EXA_API_KEY = process.env.EXA_API_KEY;
const EXA_BASE_URL = process.env.EXA_BASE_URL;
const exa = new Exa(EXA_API_KEY, EXA_BASE_URL);

async function demonstrateEventsParameter() {
  console.log("Research Events Example");
  console.log("=".repeat(50));

  const research = await exa.research.create({
    instructions: "What are the latest developments in quantum computing?",
    model: "exa-research",
  });

  console.log(`Created research: ${research.researchId}\n`);

  // Note: When status is "pending", the events property doesn't exist in the type
  console.log("1. Fetching research WITHOUT events:");
  const withoutEvents = await exa.research.get(research.researchId, {
    events: false,
  });
  console.log(`  - Status: ${withoutEvents.status}`);

  if (withoutEvents.status === "pending") {
    throw new Error("Research is still pending, cannot access events");
  }

  console.log(`  - Has events array: ${Array.isArray(withoutEvents.events)}`);
  console.log(`  - Events count: ${withoutEvents.events?.length ?? 0}\n`);

  console.log("2. Fetching research WITH events:");
  const withEvents = await exa.research.get(research.researchId, {
    events: true,
  });
  console.log(`  - Status: ${withEvents.status}`);

  if (withEvents.status === "pending") {
    throw new Error("Research is still pending, cannot access events");
  }

  console.log(`  - Has events array: ${Array.isArray(withEvents.events)}`);
  console.log(`  - Events count: ${withEvents.events?.length ?? 0}`);

  if (withEvents.events && withEvents.events.length > 0) {
    console.log("\n  Event types found:");
    const eventTypes = new Set(withEvents.events.map((e: any) => e.eventType));
    eventTypes.forEach((type) => console.log(`    - ${type}`));
  }

  console.log("\n3. Polling with events enabled:");
  const finalState = await exa.research.pollUntilFinished(research.researchId, {
    events: true,
    pollInterval: 2000,
  });

  if (finalState.status !== "completed") {
    throw new Error(`Research failed with status: ${finalState.status}`);
  }

  console.log(`  - Final status: ${finalState.status}`);
  console.log(`  - Total events: ${finalState.events?.length ?? 0}`);

  if (finalState.output?.content) {
    console.log(`\n4. Research Output:`);
    console.log(finalState.output.content.substring(0, 200) + "...");
  }
}

demonstrateEventsParameter().catch((err) => {
  console.error("Example failed:", err);
  process.exit(1);
});
