import "dotenv/config";
import Exa, { JSONSchema } from "../src/index";

const exa = new Exa(process.env.EXA_API_KEY);

type ExampleDefinition = {
  instructions: string;
  schema: JSONSchema;
};

const examples: ExampleDefinition[] = [
  {
    instructions:
      "Summarize the history of San Francisco highlighting one or two major events for each decade from 1850 to 1950",
    schema: {
      type: "object",
      required: ["timeline"],
      properties: {
        timeline: {
          type: "array",
          items: {
            type: "object",
            required: ["decade", "notableEvents"],
            properties: {
              decade: {
                type: "string",
                description: 'Decade label e.g. "1850s"',
              },
              notableEvents: {
                type: "string",
                description: "A summary of notable events.",
              },
            },
          },
        },
      },
      additionalProperties: false,
    },
  },
  {
    instructions:
      "Compile three major news stories related to environmental policy from the last week. For each story, include the article title, publication name, publication date, and a one-sentence summary.",
    schema: {
      type: "object",
      required: ["stories"],
      properties: {
        stories: {
          type: "array",
          items: {
            type: "object",
            required: ["title", "publication", "date", "summary"],
            properties: {
              title: {
                type: "string",
                description: "Headline of the article.",
              },
              publication: {
                type: "string",
                description: "Name of the news outlet.",
              },
              date: {
                type: "string",
                description: "Publication date in ISO-8601 format.",
              },
              summary: {
                type: "string",
                description: "One-sentence summary of the article.",
              },
            },
          },
        },
      },
      additionalProperties: false,
    },
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
