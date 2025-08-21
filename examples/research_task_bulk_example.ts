import "dotenv/config";
import { Exa } from "../src/index";
import { z } from "zod";

const EXA_API_KEY = process.env.EXA_API_KEY;
const EXA_BASE_URL = process.env.EXA_BASE_URL;
const exa = new Exa(EXA_API_KEY, EXA_BASE_URL);

// ===============================================
// Zod Schemas for Research Tasks
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

const NewsStory = z.object({
  title: z.string().describe("Headline of the article."),
  publication: z.string().describe("Name of the news outlet."),
  date: z.string().describe("Publication date in ISO-8601 format."),
  summary: z.string().describe("One-sentence summary of the article."),
});

const EnvironmentalNews = z.object({
  stories: z.array(NewsStory).describe("Environmental policy news stories"),
});

type ExampleDefinition = {
  instructions: string;
  schema: z.ZodSchema<any>;
};

const examples: ExampleDefinition[] = [
  {
    instructions:
      "Summarize the history of San Francisco highlighting one or two major events for each decade from 1850 to 1950",
    schema: SanFranciscoTimeline,
  },
  {
    instructions:
      "Compile three major news stories related to environmental policy from the last week. For each story, include the article title, publication name, publication date, and a one-sentence summary.",
    schema: EnvironmentalNews,
  },
];

async function runResearchExample() {
  const createdRequests = await Promise.all(
    examples.map(({ instructions, schema }) =>
      exa.research.create({
        model: "exa-research",
        instructions,
        outputSchema: schema,
      })
    )
  );

  const researchIds = createdRequests.map((t) => t.researchId);
  console.log("Created Research IDs:", researchIds);

  const listResponse = await exa.research.list();
  const retrievedIds = listResponse.data.map((t) => t.researchId);
  const allFound = researchIds.every((id) => retrievedIds.includes(id));
  console.log("All created requests present in list:", allFound);
  console.log("Streaming research results...");

  const streamingPromises = researchIds.map(async (id) => {
    const eventStream = await exa.research.get(id, { stream: true });

    for await (const event of eventStream) {
      console.log("Event:", JSON.stringify(event, undefined, 2));
    }
  });

  await Promise.all(streamingPromises);
}

runResearchExample().catch((err) => {
  console.error("Research example failed:", err);
});
