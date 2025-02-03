import Exa from "../dist";
const dotenv = require("dotenv");

dotenv.config();

const exa = new Exa(process.env.EXA_API_KEY);

/**
 * This example demonstrates how to use Exa's streaming functionality.
 * When streaming is enabled, the answer is returned in chunks as it's being generated,
 * rather than waiting for the complete response.
 */
async function runStreamingExample() {
  try {
    for await (const chunk of exa.streamAnswer("What are the latest developments in AI?")) {
      if (chunk.content) {
        process.stdout.write(chunk.content); // Write partial text as it arrives
      }
      if (chunk.citations) {
        console.log("\nCitations:", chunk.citations); // Handle citations when they arrive
      }
    }
  } catch (error) {
    console.error("Error in streaming example:", error);
  }
}

runStreamingExample(); 