import Exa from "../src/index";

const exa = new Exa(process.env.EXA_API_KEY);

async function runExamples() {
  try {
    // Search with subpages
    const search = await exa.search(
      "canonical url for the homepage of a fintech startup",
      {
        numResults: 5,
        contents: {
          subpages: 5,
          subpageTarget: "about",
          highlights: true,
        },
      }
    );
    console.log(
      "Search results with subpages:",
      JSON.stringify(search, null, 2)
    );

    // Get contents with subpages
    if (search.results.length > 0) {
      const contents = await exa.getContents([search.results[0].id], {
        subpages: 2,
        highlights: true,
      });
      console.log(
        "Get contents results with subpages:",
        JSON.stringify(contents, null, 2)
      );
    }
  } catch (error) {
    console.error("Error in examples:", error);
  }
}

runExamples();
