import Exa from "../src/index";

const exa = new Exa(process.env.EXASEARCH_API_KEY);

async function runLinksExample() {
  try {
    // Search with links
    const search = await exa.searchAndContents("latest Tesla electric vehicles", { 
      numResults: 1,
      extras: { links: 10 }  // Get up to 10 links from each result
    });
    console.log("Search results with links:", JSON.stringify(search, null, 2));

    // Find similar with links
    const similar = await exa.findSimilarAndContents("https://www.tesla.com", { 
      numResults: 1,
      extras: { links: 5 }  // Get up to 5 links from each result
    });
    console.log("Find similar results with links:", JSON.stringify(similar, null, 2));

    // Get contents with links
    if (search.results.length > 0) {
      const contents = await exa.getContents([search.results[0].id], { 
        extras: { links: 15 }  // Get up to 15 links
      });
      console.log("Get contents results with links:", JSON.stringify(contents, null, 2));
    }

  } catch (error) {
    console.error("Error in links example:", error);
  }
}

runLinksExample();
