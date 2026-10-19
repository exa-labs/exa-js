import Exa from "../src/index";

const exa = new Exa(process.env.EXA_API_KEY);

async function runExamples() {
  try {
    const search = await exa.search(
      "canonical url for the homepage of a fintech startup",
      {
        numResults: 5,
        contents: {
          highlights: true,
        },
      }
    );
    console.log("Search results:", JSON.stringify(search, null, 2));

    // Crawl subpages of the top result with getContents
    if (search.results.length > 0) {
      const contents = await exa.getContents([search.results[0].url], {
        subpages: 5,
        subpageTarget: "about",
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
