import Exa from "../src/index";

const exa = new Exa(process.env.EXA_API_KEY);

async function runAnswerExample() {
  try {
    const answer = await exa.answer("What is the current population of New York City?", {
      stream: false,
      text: true,
      model: "exa-pro",
      systemPrompt: "Answer only with the numerical population figure."
    });
    console.log("Answer result:", JSON.stringify(answer, null, 2));
  } catch (error) {
    console.error("Error in answer example:", error);
  }
}

runAnswerExample(); 