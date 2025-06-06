import Exa from "../src/index";

const exa = new Exa(process.env.EXA_API_KEY);

async function runExamples() {
  try {
    // Search with subpages
    const search = await exa.searchAndContents("canonical url for the homepage of a fintech startup", { 
      numResults: 5,
      subpages: 5,
      highlights: true,
      summary: true,
      subpageTarget: "about",
    });
    console.log("Search results with subpages:", JSON.stringify(search, null, 2));

    // Find similar with subpages
    const similar = await exa.findSimilarAndContents("https://www.tesla.com/models", { 
      subpages: 3,
      numResults: 1
    });
    console.log("Find similar results with subpages:", JSON.stringify(similar, null, 2));

    // Get contents with subpages
    if (search.results.length > 0) {
      const contents = await exa.getContents([search.results[0].id], { 
        subpages: 2,
        text: true
      });
      console.log("Get contents results with subpages:", JSON.stringify(contents, null, 2));
    }

  } catch (error) {
    console.error("Error in examples:", error);
  }
}

runExamples();
