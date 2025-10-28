import Exa from "../src/index";

const exa = new Exa(process.env.EXA_API_KEY);

async function runSearchExamples() {
  try {
    // Search without contents
    const searchResponse = await exa.searchAndContents(
      "latest AI developments",
      { text: true }
    );
    console.log(
      "Search results:",
      searchResponse.results.map((it) => it)
    );

    // Search with contents
    const searchWithContentsResponse = await exa.searchAndContents(
      "latest AI developments",
      { text: true }
    );
    console.log(
      "Search results with contents:",
      searchWithContentsResponse.results
    );
  } catch (error) {
    console.error("Error in search examples:", error);
  }
}

runSearchExamples();
