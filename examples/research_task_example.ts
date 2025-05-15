import "dotenv/config";
import Exa, { JSONSchema } from "../src/index";

const exa = new Exa(process.env.EXA_API_KEY);

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
  };
  const input = {
    instructions:
      "Summarize the history of San Francisco highlighting one or two major events for each decade from 1850 to 1950",
  };

  const response = await exa.research.createTask(input, { schema });

  console.log(JSON.stringify(response, null, 2));
}

runResearchExample().catch((err) => {
  console.error("Research example failed:", err);
});
