import Exa from "../src/index";

const exa = new Exa(process.env.EXASEARCH_API_KEY);

async function runGetContentsExample() {
  try {
    // First, perform a search to get some document IDs
    const searchResponse = await exa.search("latest AI developments");
    const documentIds = searchResponse.results.map(result => result.id);

    // Get contents for the found documents
    const contentsResponse = await exa.getContents(documentIds, { text: true });
    console.log("Get contents results:", contentsResponse.results);
  } catch (error) {
    console.error("Error in get contents example:", error);
  }
}

runGetContentsExample();
