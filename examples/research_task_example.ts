import "dotenv/config";
import Exa, { JSONSchema } from "../src/index";

const exa = new Exa(process.env.EXA_API_KEY);

async function runResearchExample() {
  const schema: JSONSchema = {
    type: "object",
    required: ["answer"],
    properties: {
      answer: { type: "string" },
    },
  };

  const input = {
    instructions: "In ≤3 sentences, explain quantum computing.",
  };

  const response = await exa.research.createTask(input, { schema });

  console.log(JSON.stringify(response, null, 2));
}

runResearchExample().catch((err) => {
  console.error("Research example failed:", err);
});
