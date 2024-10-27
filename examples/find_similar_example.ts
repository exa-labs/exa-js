import Exa from "../src/index";

const exa = new Exa(process.env.EXASEARCH_API_KEY);

async function runFindSimilarExamples() {
  try {
    // Find similar without contents
    const findSimilarResponse = await exa.findSimilar("https://www.example.com");
    console.log("Find similar results:", findSimilarResponse.results);

    // Find similar with contents
    const findSimilarWithContentsResponse = await exa.findSimilarAndContents("https://www.example.com", { summary: true });
    findSimilarResponse.results.map(it => it.text)
    console.log("Find similar results with contents:", findSimilarWithContentsResponse.results);
  } catch (error) {
    console.error("Error in find similar examples:", error);
  }
}

runFindSimilarExamples();
