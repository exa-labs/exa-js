import Exa from "../src/index";

const exa = new Exa(process.env.EXA_API_KEY);

async function runLinksExample() {
  try {
    // Search with links
    const search = await exa.search("latest Tesla electric vehicles", {
      numResults: 1,
      contents: {
        extras: { links: 10 }, // Get up to 10 links from each result
      },
    });
    console.log("Search results with links:", JSON.stringify(search, null, 2));

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
