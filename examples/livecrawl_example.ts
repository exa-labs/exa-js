import Exa, { type Status } from "../src/index";

const exa = new Exa(process.env.EXA_API_KEY);

/**
 * Returns the text of the one page a getContents call asked for. A page that
 * could not be fetched comes back as an error in `statuses` instead of a
 * result, so print that error and return undefined.
 */
function pageText(
  label: string,
  response: { results: Array<{ text?: string }>; statuses?: Status[] }
): string | undefined {
  const text = response.results[0]?.text;
  if (text === undefined) {
    const status = response.statuses?.[0];
    console.log(
      `No text ${label}: status ${status?.status ?? "missing"}, error ${JSON.stringify(status?.error ?? null)}`
    );
  }
  return text;
}

async function runLivecrawlExample() {
  try {
    // Get contents without livecrawl
    const contentsWithoutLivecrawl = await exa.getContents("tesla.com", {
      livecrawl: "never",
      text: true,
    });
    console.log(
      "Get contents results without livecrawl:",
      JSON.stringify(contentsWithoutLivecrawl, null, 2)
    );

    // Get contents with livecrawl
    const contentsWithLivecrawl = await exa.getContents("tesla.com", {
      livecrawl: "always",
      text: true,
    });
    console.log(
      "Get contents results with livecrawl:",
      JSON.stringify(contentsWithLivecrawl, null, 2)
    );

    const textWithoutLivecrawl = pageText(
      "without livecrawl",
      contentsWithoutLivecrawl
    );
    const textWithLivecrawl = pageText("with livecrawl", contentsWithLivecrawl);
    if (textWithoutLivecrawl === undefined || textWithLivecrawl === undefined) {
      console.log("Livecrawl comparison skipped: a page has no text.");
      return;
    }

    // Compare the results
    if (textWithoutLivecrawl !== textWithLivecrawl) {
      console.log(
        "Livecrawl comparison successful: The content with and without livecrawl is different."
      );
    } else {
      console.log(
        "Livecrawl comparison note: The content with and without livecrawl is the same."
      );
    }

    // Log the lengths of the texts for comparison
    console.log(
      "Length of text without livecrawl:",
      textWithoutLivecrawl.length
    );
    console.log("Length of text with livecrawl:", textWithLivecrawl.length);
  } catch (error) {
    console.error("Error in livecrawl example:", error);
    process.exitCode = 1;
  }
}

runLivecrawlExample();
