import Exa from "../src/index";

const exa = new Exa(process.env.EXA_API_KEY);

async function runAnswerExample() {
  try {
    const answer = await exa.answer(
      "What is the current population of New York City?",
      {
        stream: false,
        text: true,
        model: "exa",
        systemPrompt: "Answer only with the numerical population figure.",
      }
    );
    console.log("Answer result:", JSON.stringify(answer, null, 2));

    const structuredAnswer = await exa.answer(
      "What is the current population of New York City?",
      {
        stream: false,
        text: true,
        model: "exa",
        outputSchema: {
          type: "object",
          required: ["answer"],
          additionalProperties: false,
          properties: {
            answer: {
              type: "number",
            },
          },
        },
      }
    );
    console.log("Answer result:", JSON.stringify(structuredAnswer, null, 2));

    const answerFromLocation = await exa.answer("National museum", {
      userLocation: "FR",
    });
    console.log("Answer result:", JSON.stringify(answerFromLocation, null, 2));

    // Coordinates are used only for queries that name no place but depend on
    // where the user is. They do not set a country, so send `country` with
    // them to localize results.
    const answerNearby = await exa.answer("Coffee shops open now", {
      userLocation: { country: "US", latitude: 37.7749, longitude: -122.4194 },
    });
    console.log("Answer result:", JSON.stringify(answerNearby, null, 2));
  } catch (error) {
    console.error("Error in answer example:", error);
  }
}

runAnswerExample();
