import "dotenv/config";
import Exa, { JSONSchema } from "../src/index";

const exa = new Exa(process.env.EXA_API_KEY, "http://localhost:3002");

async function runResearchExample() {
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
  const input = {
    instructions:
      "Summarize the history of San Francisco highlighting one or two major events for each decade from 1850 to 1950",
  };

  const { id: taskId } = await exa.research.createTask(input, { schema });

  console.log("Task ID:", taskId);

  const response = await exa.research.pollTask(taskId);

  console.log("Final Task State:", JSON.stringify(response, null, 2));
}

runResearchExample().catch((err) => {
  console.error("Research example failed:", err);
});
