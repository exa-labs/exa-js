import Exa from "../src/index";

const exa = new Exa(process.env.EXA_API_KEY);

async function runLivecrawlExample() {
  try {
    // Get contents without livecrawl
    const contentsWithoutLivecrawl = await exa.getContents("tesla.com", { 
      livecrawl: "never",
      text: true
    });
    console.log("Get contents results without livecrawl:", JSON.stringify(contentsWithoutLivecrawl, null, 2));

    // Get contents with livecrawl
    const contentsWithLivecrawl = await exa.getContents("tesla.com", { 
      livecrawl: "always",
      text: true
    });
    console.log("Get contents results with livecrawl:", JSON.stringify(contentsWithLivecrawl, null, 2));

    // Compare the results
    const textWithoutLivecrawl = contentsWithoutLivecrawl.results[0].text;
    const textWithLivecrawl = contentsWithLivecrawl.results[0].text;

    if (textWithoutLivecrawl !== textWithLivecrawl) {
      console.log("Livecrawl comparison successful: The content with and without livecrawl is different.");
    } else {
      console.log("Livecrawl comparison note: The content with and without livecrawl is the same.");
    }

    // Log the lengths of the texts for comparison
    console.log("Length of text without livecrawl:", textWithoutLivecrawl.length);
    console.log("Length of text with livecrawl:", textWithLivecrawl.length);

  } catch (error) {
    console.error("Error in livecrawl example:", error);
  }
}

runLivecrawlExample();
