import "dotenv/config";
import { OpenAI } from "openai";

async function main() {
  const openai = new OpenAI({
    apiKey: process.env.EXA_API_KEY,
    baseURL: "https://api.exa.ai",
  });

  const stream = await openai.responses.create({
    model: "exa-research",
    input: "Tell me about recent market trends in the U.S.",
    instructions: "You must answer in all caps.",
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
