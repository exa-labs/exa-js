import Exa, { ContentsOptions, SearchResult } from "exa-js";
import OpenAI from "openai";
import * as dotenv from "dotenv";
dotenv.config();

const EXA_API_KEY = process.env.EXA_API_KEY!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

const exa = new Exa(EXA_API_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

async function getLLMResponse({
  system = "You are a helpful assistant.",
  user = "",
  temperature = 1,
  model = "gpt-3.5-turbo",
}) {
  const completion = await openai.chat.completions.create({
    model,
    temperature,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  return completion?.choices?.[0]?.message.content;
}

// Let's generalize the prompt and call the search types (1) and (2) in case the LLM is sensitive to the names. We can replace them with different names programmatically to see what works best.
const SEARCH_TYPE_EXPLANATION = `- (1) search is preferred because lets us retrieve high quality, up-to-date, and semantically relevant data. It is especially suitable when a topic is well-known and popularly discussed on the Internet, allowing the machine learning model to retrieve contents which are more likely recommended by real humans.  
- (2) search is only necessary when the topic is extremely specific, local or obscure. If the machine learning model might not know about the topic, but relevant documents can be found by directly matching the search query, (2) search is suitable.
`;
async function decideSearchType(
  topic: string,
  choiceNames: string[] = ["keyword", "neural"]
) {
  let userMessage =
    'Decide whether to use (1) or (2) search for the provided research topic. Output your choice in a single word: either "(1)" or "(2)". Here is a guide that will help you choose:\n';
  userMessage += SEARCH_TYPE_EXPLANATION;
  userMessage += `Topic: ${topic}\n`;
  userMessage += "Search type: ";
  userMessage = userMessage
    ?.replaceAll("(1)", choiceNames?.[0] || "neural")
    ?.replaceAll("(2)", choiceNames?.[1] || "neural");

  const response = await getLLMResponse({
    system:
      "You will be asked to make a choice between two options. Answer with your choice in a single word.",
    user: userMessage,
    temperature: 0,
  });
  const useKeyword = response
    ?.trim()
    .toLowerCase()
    .startsWith(choiceNames?.[1]?.toLowerCase() || "neural");
  return useKeyword ? "keyword" : "neural";
}

function createKeywordQueryGenerationPrompt(topic: string, n: number) {
  return `I'm writing a research report on ${topic} and need help coming up with Google keyword search queries.
Google keyword searches should just be a few words long. It should not be a complete sentence.
Please generate a diverse list of ${n} Google keyword search queries that would be useful for writing a research report on ${topic}. Do not add any formatting or numbering to the queries.`;
}

function createNeuralQueryGenerationPrompt(topic: string, n: number) {
  return `I'm writing a research report on ${topic} and need help coming up with Exa keyword search queries.
Exa is a fully neural search engine that uses an embeddings based approach to search. Exa was trained on how people refer to content on the internet. The model is trained given the description to predict the link. For example, if someone tweets 'This is an amazing, scientific article about Roman architecture: <link>', then our model is trained given the description to predict the link, and it is able to beautifully and super strongly learn associations between descriptions and the nature of the content (style, tone, entity type, etc) after being trained on many many examples. Because Exa was trained on examples of how people talk about links on the Internet, the actual Exa queries must actually be formed as if they are content recommendations that someone would make on the Internet where a highly relevant link would naturally follow the recommendation, such as the example shown above.
Exa neural search queries should be phrased like a person on the Internet indicating a webpage to a friend by describing its contents. It should end in a colon :.
Please generate a diverse list of ${n} Exa neural search queries for informative and trustworthy sources useful for writing a research report on ${topic}. Do not add any quotations or numbering to the queries.`;
}

async function generateSearchQueries(
  topic: string,
  n: number,
  searchType: string
) {
  if (searchType !== "keyword" && searchType !== "neural") {
    throw "invalid searchType";
  }
  const userPrompt =
    searchType === "neural"
      ? createNeuralQueryGenerationPrompt(topic, n)
      : createKeywordQueryGenerationPrompt(topic, n);
  const completion = await getLLMResponse({
    system:
      "The user will ask you to help generate some search queries. Respond with only the suggested queries in plain text with no extra formatting, each on it's own line.",
    user: userPrompt,
    temperature: 1,
  });
  const queries = completion
    ?.split("\n")
    .filter((s) => s.trim().length > 0)
    .slice(0, n);
  return queries;
}

async function getSearchResults(
  queries: string[],
  type: string,
  linksPerQuery = 2
) {
  let results = [];
  for (const query of queries || []) {
    const searchResponse = await exa.search(query, {
      type,
      numResults: linksPerQuery,
      useAutoprompt: false,
    });
    results.push(...searchResponse.results);
  }
  return results;
}

async function getPageContents(searchResults: SearchResult[]) {
  const contentsResponse = await exa.getContents(searchResults);
  return contentsResponse.results;
}

async function synthesizeReport(
  topic: string,
  searchContents: SearchResult<ContentsOptions>[],
  contentSlice = 750
) {
  const inputData = searchContents
    .map(
      (item) =>
        `--START ITEM--\nURL: ${item.url}\nCONTENT: ${item?.text?.slice(
          0,
          contentSlice
        )}\n--END ITEM--\n`
    )
    .join("");
  return await getLLMResponse({
    system:
      "You are a helpful research assistant. Write a report according to the user's instructions.",
    user: `Input Data:\n${inputData}Write a two paragraph research report about ${topic} based on the provided information. Include as many sources as possible. Provide citations in the text using footnote notation ([#]). First provide the report, followed by a single "References" section that lists all the URLs used, in the format [#] <url>.`,
    //model: 'gpt-4' //want a better report? use gpt-4
  });
}

async function researcher(topic: string) {
  const searchType = await decideSearchType(topic);
  const searchQueries = await generateSearchQueries(topic, 3, searchType);
  console.log(searchQueries);
  const searchResults = await getSearchResults(searchQueries || [], searchType);
  console.log(searchResults[0]);
  const searchContents = await getPageContents(searchResults);
  console.log(searchContents[0]);
  const report = await synthesizeReport(topic, searchContents);
  return report;
}

const run = async () => {
  console.log(await researcher("renaissance art"));
  console.log(await researcher("xyzzy"));
};

run().catch(console.error);
