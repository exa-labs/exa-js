import "dotenv/config";
import { OpenAI } from "openai";

async function main() {
  const openai = new OpenAI({
    apiKey: process.env.EXA_API_KEY,
    baseURL: "https://api.exa.ai",
  });

  const stream = await openai.chat.completions.create({
    model: "exa-research",
    messages: [
      {
        role: "user",
        content: "What are ants",
      },
    ],
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices?.[0]?.delta?.content;
    if (content) {
      process.stdout.write(content);
    }
  }
}

main().catch((err) => {
  console.error("Chat completion example failed:", err);
  process.exit(1);
});
