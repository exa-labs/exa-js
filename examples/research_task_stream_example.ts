import "dotenv/config";
import Exa, { JSONSchema, ResearchModel } from "../src/index";

const exa = new Exa(process.env.EXA_API_KEY);

const instructions =
  "Summarize the history of San Francisco highlighting one or two major events for each decade from 1850 to 1950";
const schema: JSONSchema = {
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
};

async function runResearchExample() {
  // Create a single research task
  const createdTask = await exa.research.createTask({
    model: ResearchModel.exa_research,
    instructions,
    output: { schema },
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
