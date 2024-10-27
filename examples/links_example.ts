import Exa from "../src/index";
import assert from 'assert';

const exa = new Exa(process.env.EXASEARCH_API_KEY);

async function runLinksExample() {
  try {
    // Search with links
    const search = await exa.searchAndContents("latest Tesla electric vehicles", { 
      numResults: 1,
      extras: { links: 10 }  // Get up to 10 links from each result
    });
    console.log("Search results with links:", JSON.stringify(search, null, 2));
    assert(search.results[0].extras.links && search.results[0].extras.links.length > 0, "Links array is empty for search results");

    // Find similar with links
    const similar = await exa.findSimilarAndContents("https://www.tesla.com", { 
      numResults: 1,
      extras: { links: 5 }  // Get up to 5 links from each result
    });
    console.log("Find similar results with links:", JSON.stringify(similar, null, 2));
    assert(similar.results[0].extras.links && similar.results[0].extras.links.length > 0, "Links array is empty for similar results");

    // Get contents with links
    if (search.results.length > 0) {
      const contents = await exa.getContents([search.results[0].id], { 
        extras: { links: 15 }  // Get up to 15 links
      });
      console.log("Get contents results with links:", JSON.stringify(contents, null, 2));
      assert(contents.results[0].extras.links && contents.results[0].extras.links.length > 0, "Links array is empty for contents results");
    }

  } catch (error) {
    console.error("Error in links example:", error);
  }
}

runLinksExample();
