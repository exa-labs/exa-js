import Exa from "../src/index";

import assert from "assert"

const exa = new Exa(process.env.EXASEARCH_API_KEY);

async function runLivecrawlExample() {
  try {
    // Get contents without livecrawl
    const contentsWithoutLivecrawl = await exa.getContents("tesla.com", { 
      livecrawl: "never",
      text: true
    });
    console.log("Get contents results without livecrawl:", JSON.stringify(contentsWithoutLivecrawl, null, 2));
    assert(contentsWithoutLivecrawl.results[0].text, "Text content is missing from get contents results without livecrawl");

    // Get contents with livecrawl
    const contentsWithLivecrawl = await exa.getContents("tesla.com", { 
      livecrawl: "always",
      text: true
    });
    console.log("Get contents results with livecrawl:", JSON.stringify(contentsWithLivecrawl, null, 2));
    assert(contentsWithLivecrawl.results[0].text, "Text content is missing from get contents results with livecrawl");

    // Compare the results
    const textWithoutLivecrawl = contentsWithoutLivecrawl.results[0].text;
    const textWithLivecrawl = contentsWithLivecrawl.results[0].text;

    assert(textWithoutLivecrawl !== textWithLivecrawl, "The content with and without livecrawl should be different");
    console.log("Livecrawl comparison successful: The content with and without livecrawl is different.");

    // Log the lengths of the texts for comparison
    console.log("Length of text without livecrawl:", textWithoutLivecrawl.length);
    console.log("Length of text with livecrawl:", textWithLivecrawl.length);

  } catch (error) {
    console.error("Error in livecrawl example:", error);
  }
}

runLivecrawlExample();
