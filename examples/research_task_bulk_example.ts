import "dotenv/config";
import { Exa } from "../src/index";
import { z } from "zod";

const exa = new Exa(process.env.EXA_API_KEY);

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
  const createdTasks = await Promise.all(
    examples.map(({ instructions, schema }) =>
      exa.research.createTask({
        model: "exa-research",
        instructions,
        output: { schema },
      })
    )
  );

  const taskIds = createdTasks.map((t) => t.id);
  console.log("Created Task IDs:", taskIds);

  const listResponse = await exa.research.listTasks();
  const retrievedIds = listResponse.data.map((t) => t.id);
  const allFound = taskIds.every((id) => retrievedIds.includes(id));
  console.log("All created tasks present in list:", allFound);
  console.log("Polling until research completion...");

  const pollingPromises = taskIds.map((id) =>
    exa.research.pollTask(id).then((result) => {
      console.log(
        `Final Task State for ${id}:`,
        JSON.stringify(result, null, 2)
      );
      return result;
    })
  );

  await Promise.all(pollingPromises);
}

runResearchExample().catch((err) => {
  console.error("Research example failed:", err);
});
