import "dotenv/config";
import { OpenAI } from "openai";

async function main() {
  const openai = new OpenAI({
    apiKey: process.env.EXA_API_KEY,
    // baseURL: "https://api.exa.ai",
    baseURL: "http://localhost:3002",
  });

  const stream = await openai.responses.create({
    model: "exa-research",
    input: "I just want you to tell me what state minneapolis is in",
    instructions: "do not overthink it. answer fast if you can",
    stream: true,
  });

  for await (const chunk of stream) {
    console.log(chunk);
  }
}

main().catch((err) => {
  console.error("Chat completion example failed:", err);
  process.exit(1);
});
