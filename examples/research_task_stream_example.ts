import "dotenv/config";
import { Exa } from "../src/index";
import { z } from "zod";

const EXA_API_KEY = process.env.EXA_API_KEY;
const EXA_BASE_URL = process.env.EXA_BASE_URL;
const exa = new Exa(EXA_API_KEY, EXA_BASE_URL);

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
  const research = await exa.research.create({
    model: "exa-research",
    instructions,
    outputSchema: SanFranciscoTimeline,
  });

  console.log("Created Research ID:", research.researchId);

  const stream = await exa.research.get(research.researchId, { stream: true });
  for await (const event of stream) {
    console.log("Research Event:", event);
  }
}

runResearchExample().catch((err) => {
  console.error("Research example failed:", err);
});
