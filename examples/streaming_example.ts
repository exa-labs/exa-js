import Exa from "../src/index";

const exa = new Exa(process.env.EXASEARCH_API_KEY);

/**
 * This example demonstrates how to use Exa's streaming functionality.
 * When streaming is enabled, the answer is returned in chunks as it's being generated,
 * rather than waiting for the complete response.
 */
async function runStreamingExample() {
  try {
    console.log("\nStreaming answer example:");
    await exa.answer(
      "What are the latest developments in AI?",
      {
        expandedQueriesLimit: 2,
        stream: true,
        includeText: false
      },
      (chunk) => {
        console.log(chunk);
      }
    );
  } catch (error) {
    console.error("Error in answer example:", error);
  }
}

runStreamingExample(); 