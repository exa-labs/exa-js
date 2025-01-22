import Exa from "../src";
const dotenv = require("dotenv");

dotenv.config();

const exa = new Exa(process.env.EXASEARCH_API_KEY);

async function runAnswerExample() {
  try {
    const Answer = await exa.answer("What is the current population of New York City?", {
      expandedQueriesLimit: 1,
      stream: false,
      includeText: false
    });
    console.log("Answer result:", JSON.stringify(Answer, null, 2));
  } catch (error) {
    console.error("Error in answer example:", error);
  }
}

runAnswerExample(); 