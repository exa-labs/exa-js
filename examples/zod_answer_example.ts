/**
 * Zod Answer Example for Exa
 *
 * This example demonstrates how to use Zod schemas with the answer endpoint
 * for structured response generation.
 */

import { Exa } from "../src";
import { z } from "zod";

const EXA_API_KEY = process.env.EXA_API_KEY;
const EXA_BASE_URL = process.env.EXA_BASE_URL;

const exa = new Exa(EXA_API_KEY, EXA_BASE_URL);

// ===============================================
// Zod Schemas for Structured Answers
// ===============================================

const ComparisonAnalysis = z.object({
  title: z.string().describe("Title of the comparison"),
  executive_summary: z
    .string()
    .describe("Brief summary of the key differences"),
  items_compared: z.array(z.string()).describe("List of items being compared"),
  key_differences: z
    .array(z.string())
    .describe("Main differences between the items"),
  similarities: z.array(z.string()).optional().describe("Key similarities"),
  winner: z
    .string()
    .optional()
    .describe("Which item is better overall, if applicable"),
  reasoning: z
    .string()
    .optional()
    .describe("Explanation for the winner choice"),
  recommendation: z.string().describe("Final recommendation or advice"),
});

const TechnicalExplanation = z.object({
  topic: z.string().describe("The technical topic being explained"),
  simple_explanation: z.string().describe("Simple, non-technical explanation"),
  technical_details: z.string().describe("More detailed technical explanation"),
  key_concepts: z
    .array(z.string())
    .describe("Important concepts to understand"),
  real_world_applications: z
    .array(z.string())
    .optional()
    .describe("How this is used in practice"),
  prerequisites: z
    .array(z.string())
    .optional()
    .describe("Background knowledge needed"),
  further_reading: z
    .array(z.string())
    .optional()
    .describe("Resources for deeper learning"),
});

const MarketResearch = z.object({
  market_name: z.string().describe("Name of the market being analyzed"),
  market_size: z.string().optional().describe("Size of the market"),
  growth_rate: z.string().optional().describe("Market growth rate"),
  key_players: z.array(z.string()).describe("Major companies in this market"),
  market_trends: z
    .array(z.string())
    .describe("Current trends shaping the market"),
  opportunities: z.array(z.string()).describe("Market opportunities"),
  challenges: z.array(z.string()).describe("Market challenges"),
  outlook: z.string().describe("Future outlook for the market"),
});

const SimpleComparison = z.object({
  summary: z.string().describe("Brief summary of the topic"),
  pros: z.array(z.string()).describe("List of advantages"),
  cons: z.array(z.string()).describe("List of disadvantages"),
});

// ===============================================
// Example Functions
// ===============================================

async function compareTechnologies() {
  console.log("Example 1: Technology Comparison");
  console.log("=".repeat(40));

  try {
    const response = await exa.answer(
      "Compare React vs Vue.js vs Angular for web development. Include pros, cons, and recommendations.",
      {
        outputSchema: ComparisonAnalysis,
        model: "exa",
      }
    );

    // TypeScript knows this is ComparisonAnalysis type!
    const comparison = response.answer as z.infer<typeof ComparisonAnalysis>;

    console.log("Title:", comparison.title);
    console.log("\nExecutive Summary:");
    console.log(comparison.executive_summary);

    console.log("\nItems Compared:", comparison.items_compared.join(", "));

    console.log("\nKey Differences:");
    comparison.key_differences.forEach((diff) => console.log(`  • ${diff}`));

    if (comparison.similarities) {
      console.log("\nSimilarities:");
      comparison.similarities.forEach((sim) => console.log(`  • ${sim}`));
    }

    if (comparison.winner) {
      console.log(`\nRecommended Choice: ${comparison.winner}`);
      console.log(`Reasoning: ${comparison.reasoning}`);
    }

    console.log("\nFinal Recommendation:");
    console.log(comparison.recommendation);

    console.log(`\nSources: ${response.citations.length} citations`);
  } catch (error) {
    console.error("Error in technology comparison:", error);
  }
}

async function explainTechnicalConcept() {
  console.log("\n\nExample 2: Technical Explanation");
  console.log("=".repeat(40));

  try {
    const response = await exa.answer(
      "Explain quantum computing in detail, including both simple and technical explanations",
      {
        outputSchema: TechnicalExplanation,
        model: "exa",
      }
    );

    // TypeScript knows this is TechnicalExplanation type!
    const explanation = response.answer as z.infer<typeof TechnicalExplanation>;

    console.log("Topic:", explanation.topic);
    console.log("\nSimple Explanation:");
    console.log(explanation.simple_explanation);

    console.log("\nTechnical Details:");
    console.log(explanation.technical_details);

    console.log("\nKey Concepts:");
    explanation.key_concepts.forEach((concept) =>
      console.log(`  • ${concept}`)
    );

    if (explanation.real_world_applications) {
      console.log("\nReal-World Applications:");
      explanation.real_world_applications.forEach((app) =>
        console.log(`  • ${app}`)
      );
    }

    if (explanation.prerequisites) {
      console.log("\nPrerequisites:");
      explanation.prerequisites.forEach((prereq) =>
        console.log(`  • ${prereq}`)
      );
    }

    console.log(`\nSources: ${response.citations.length} citations`);
  } catch (error) {
    console.error("Error in technical explanation:", error);
  }
}

async function researchMarket() {
  console.log("\n\nExample 3: Market Research");
  console.log("=".repeat(40));

  try {
    const response = await exa.answer(
      "Analyze the electric vehicle market including size, growth, key players, trends, and outlook",
      {
        outputSchema: MarketResearch,
        model: "exa",
      }
    );

    // TypeScript knows this is MarketResearch type!
    const research = response.answer as z.infer<typeof MarketResearch>;

    console.log("Market:", research.market_name);

    if (research.market_size) {
      console.log("Market Size:", research.market_size);
    }

    if (research.growth_rate) {
      console.log("Growth Rate:", research.growth_rate);
    }

    console.log("\nKey Players:");
    research.key_players.forEach((player) => console.log(`  • ${player}`));

    console.log("\nMarket Trends:");
    research.market_trends.forEach((trend) => console.log(`  • ${trend}`));

    console.log("\nOpportunities:");
    research.opportunities.forEach((opp) => console.log(`  • ${opp}`));

    console.log("\nChallenges:");
    research.challenges.forEach((challenge) => console.log(`  • ${challenge}`));

    console.log("\nMarket Outlook:");
    console.log(research.outlook);

    console.log(`\nSources: ${response.citations.length} citations`);
  } catch (error) {
    console.error("Error in market research:", error);
  }
}

async function simpleStructuredOutput() {
  console.log("\n\nExample 4: Simple Structured Output");
  console.log("=".repeat(40));

  try {
    const response = await exa.answer(
      "What are the pros and cons of remote work?",
      {
        outputSchema: SimpleComparison,
        model: "exa",
      }
    );

    // TypeScript knows this is SimpleComparison type!
    const comparison = response.answer as z.infer<typeof SimpleComparison>;

    console.log("Summary:", comparison.summary);

    console.log("\nPros:");
    comparison.pros.forEach((pro) => console.log(`  • ${pro}`));

    console.log("\nCons:");
    comparison.cons.forEach((con) => console.log(`  • ${con}`));

    console.log(`\nSources: ${response.citations.length} citations`);
  } catch (error) {
    console.error("Error in simple structured output:", error);
  }
}

// ===============================================
// Main Function
// ===============================================

async function main() {
  console.log("🚀 Zod Answer Integration Examples\n");

  await compareTechnologies();
  await explainTechnicalConcept();
  await researchMarket();
  await simpleStructuredOutput();

  console.log("\n✅ All answer examples completed!");
}

// Export schemas and functions for use in other examples
export {
  ComparisonAnalysis,
  TechnicalExplanation,
  MarketResearch,
  SimpleComparison,
  main as runAnswerExamples,
};

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}
