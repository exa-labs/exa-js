import Exa from "../src/index";

import assert from "assert";

const exa = new Exa(process.env.EXASEARCH_API_KEY);

async function runExamples() {
  try {
    // Search with subpages
    const search = await exa.searchAndContents("latest Tesla electric vehicles", { 
      subpages: 5,
      numResults: 1
    });
    console.log("Search results with subpages:", JSON.stringify(search, null, 2));
    assert(search.results[0].subpages && search.results[0].subpages.length > 0, "Subpages array is empty for search results");

    // Find similar with subpages
    const similar = await exa.findSimilarAndContents("https://www.tesla.com/models", { 
      subpages: 3,
      numResults: 1
    });
    console.log("Find similar results with subpages:", JSON.stringify(similar, null, 2));
    assert(similar.results[0].subpages && similar.results[0].subpages.length > 0, "Subpages array is empty for similar results");

    // Get contents with subpages
    if (search.results.length > 0) {
      const contents = await exa.getContents([search.results[0].id], { 
        subpages: 2,
        text: true
      });
      console.log("Get contents results with subpages:", JSON.stringify(contents, null, 2));
      assert(contents.results[0].subpages && contents.results[0].subpages.length > 0, "Subpages array is empty for contents results");
    }

  } catch (error) {
    console.error("Error in examples:", error);
  }
}

runExamples();
