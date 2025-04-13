import Exa from "../src/index";

const exa = new Exa(process.env.EXA_API_KEY);

async function runGetContentsExample() {
  try {
    // First, perform a search to get some document URLs
    const searchResponse = await exa.search("latest AI developments");
    const documentUrls = searchResponse.results.map(result => result.url);

    // Get contents for the found documents
    const contentsResponse = await exa.getContents(documentUrls, { text: true });
    console.log("Get contents results:", contentsResponse.results);
  } catch (error) {
    console.error("Error in get contents example:", error);
  }
}

runGetContentsExample();
