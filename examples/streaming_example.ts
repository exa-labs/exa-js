import Exa from "../src";

const exa = new Exa(process.env.EXASEARCH_API_KEY);

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