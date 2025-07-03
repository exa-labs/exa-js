import "dotenv/config";
import { Exa } from "../src/index";
import { z } from "zod";

const exa = new Exa(process.env.EXA_API_KEY);

// ===============================================
// Zod Schema for Research Task
// ===============================================

const TimelineEvent = z.object({
  decade: z.string().describe('Decade label e.g. "1850s"'),
  notableEvents: z.string().describe("A summary of notable events."),
});

const SanFranciscoTimeline = z.object({
  timeline: z
    .array(TimelineEvent)
    .describe("Timeline of San Francisco history"),
});

const instructions =
  "Summarize the history of San Francisco highlighting one or two major events for each decade from 1850 to 1950";

async function runResearchExample() {
  // Create a single research task
  const createdTask = await exa.research.createTask({
    model: "exa-research",
    instructions,
    output: { schema: SanFranciscoTimeline },
  });

  const taskId = createdTask.id;
  console.log("Created Task ID:", taskId);

  const stream = await exa.research.getTask(taskId, { stream: true });
  for await (const event of stream) {
    console.log("Research Event:", event);
  }
}

runResearchExample().catch((err) => {
  console.error("Research example failed:", err);
});
