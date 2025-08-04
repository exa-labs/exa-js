/**
 * Zod Research Example for Exa
 *
 * This example demonstrates how to use Zod schemas with the research endpoint
 * for comprehensive analysis with parallelizable research tasks.
 */

import { Exa } from "../src";
import { z } from "zod";

const EXA_API_KEY = process.env.EXA_API_KEY;
const EXA_BASE_URL = process.env.EXA_BASE_URL;

const exa = new Exa(EXA_API_KEY, EXA_BASE_URL);

// ===============================================
// Zod Schemas for Research Analysis
// ===============================================

const TechnologyInfo = z.object({
  name: z.string().describe("Name of the technology"),
  description: z.string().describe("Brief description of what it does"),
  maturity_level: z
    .string()
    .optional()
    .describe("How mature/established the technology is"),
  key_players: z
    .array(z.string())
    .optional()
    .describe("Companies or organizations leading this technology"),
});

const CompanyProfile = z.object({
  name: z.string().describe("Company name"),
  industry: z.string().describe("Primary industry"),
  funding_amount: z
    .string()
    .optional()
    .describe("Latest funding amount if available"),
  notable_achievements: z
    .array(z.string())
    .optional()
    .describe("Key achievements or milestones"),
});

const ResearchInsight = z.object({
  title: z.string().describe("Title of the research or insight"),
  summary: z.string().describe("Brief summary of the finding"),
  impact: z.string().optional().describe("Potential impact or significance"),
});

const TechnologyLandscape = z.object({
  emerging_technologies: z
    .array(TechnologyInfo)
    .describe("List of emerging technologies in the field"),
  market_leaders: z
    .array(CompanyProfile)
    .describe("Leading companies in the market"),
  investment_trends: z
    .array(ResearchInsight)
    .describe("Current investment and funding trends"),
});

const StartupEcosystem = z.object({
  top_startups: z
    .array(CompanyProfile)
    .describe("Most promising startups in the space"),
  funding_rounds: z
    .array(ResearchInsight)
    .describe("Recent significant funding rounds and deals"),
  industry_challenges: z
    .array(ResearchInsight)
    .describe("Key challenges facing the industry"),
});

const ResearchPaper = z.object({
  title: z.string().describe("Paper title"),
  authors: z.array(z.string()).describe("List of authors"),
  key_contribution: z.string().describe("Main contribution or finding"),
  significance: z
    .string()
    .optional()
    .describe("Why this research is important"),
});

const Researcher = z.object({
  name: z.string().describe("Researcher's name"),
  affiliation: z.string().describe("Institution or company"),
  expertise: z.string().describe("Area of expertise"),
  notable_work: z
    .array(z.string())
    .optional()
    .describe("Notable research or contributions"),
});

const Application = z.object({
  application_area: z.string().describe("Area where technology is applied"),
  description: z.string().describe("How the technology is being used"),
  companies: z
    .array(z.string())
    .optional()
    .describe("Companies implementing this application"),
});

const AIResearchOverview = z.object({
  breakthrough_papers: z
    .array(ResearchPaper)
    .describe("Recent breakthrough research papers"),
  leading_researchers: z
    .array(Researcher)
    .describe("Top researchers in the field"),
  commercial_applications: z
    .array(Application)
    .describe("Real-world applications and implementations"),
});

// ===============================================
// Example Functions
// ===============================================

async function analyzeTechnologyLandscape() {
  console.log("Example 1: Technology Landscape Analysis");
  console.log("=".repeat(40));

  try {
    // Create the research task
    const task = await exa.research.createTask({
      instructions:
        "quantum computing technology landscape, market leaders, and investment trends",
      output: {
        schema: TechnologyLandscape,
      },
      model: "exa-research",
    });

    console.log(`Created task ${task.id}, polling for completion...`);

    // Poll until completion
    const finalTask = await exa.research.pollTask(task.id);

    // TypeScript knows this is TechnologyLandscape type!
    const analysis = finalTask.data as z.infer<typeof TechnologyLandscape>;

    console.log("Emerging Technologies:");
    analysis.emerging_technologies.forEach((tech) => {
      console.log(`  • ${tech.name}: ${tech.description}`);
      if (tech.key_players) {
        console.log(`    Key Players: ${tech.key_players.join(", ")}`);
      }
    });

    console.log("\nMarket Leaders:");
    analysis.market_leaders.forEach((company) => {
      console.log(`  • ${company.name} (${company.industry})`);
      if (company.funding_amount) {
        console.log(`    Funding: ${company.funding_amount}`);
      }
    });

    console.log("\nInvestment Trends:");
    analysis.investment_trends.forEach((trend) => {
      console.log(`  • ${trend.title}: ${trend.summary}`);
    });
  } catch (error) {
    console.error("Error in technology landscape analysis:", error);
  }
}

async function researchStartupEcosystem() {
  console.log("\n\nExample 2: Startup Ecosystem Research");
  console.log("=".repeat(40));

  try {
    // Create the research task
    const task = await exa.research.createTask({
      instructions:
        "fintech startup ecosystem, top companies, funding rounds, and industry challenges",
      output: {
        schema: StartupEcosystem,
      },
      model: "exa-research",
    });

    console.log(`Created task ${task.id}, polling for completion...`);

    // Poll until completion
    const finalTask = await exa.research.pollTask(task.id);

    // TypeScript knows this is StartupEcosystem type!
    const ecosystem = finalTask.data as z.infer<typeof StartupEcosystem>;

    console.log("Top Startups:");
    ecosystem.top_startups.forEach((startup) => {
      console.log(`  • ${startup.name} (${startup.industry})`);
      if (startup.funding_amount) {
        console.log(`    Funding: ${startup.funding_amount}`);
      }
      if (startup.notable_achievements) {
        console.log(
          `    Achievements: ${startup.notable_achievements.join(", ")}`
        );
      }
    });

    console.log("\nRecent Funding Rounds:");
    ecosystem.funding_rounds.forEach((round) => {
      console.log(`  • ${round.title}: ${round.summary}`);
    });

    console.log("\nIndustry Challenges:");
    ecosystem.industry_challenges.forEach((challenge) => {
      console.log(`  • ${challenge.title}: ${challenge.summary}`);
    });
  } catch (error) {
    console.error("Error in startup ecosystem research:", error);
  }
}

async function exploreAIResearch() {
  console.log("\n\nExample 3: AI Research Exploration");
  console.log("=".repeat(40));

  try {
    // Create the research task
    const task = await exa.research.createTask({
      instructions:
        "AI research landscape including breakthrough papers, leading researchers, and commercial applications",
      output: {
        schema: AIResearchOverview,
      },
      model: "exa-research",
    });

    console.log(`Created task ${task.id}, polling for completion...`);

    // Poll until completion
    const finalTask = await exa.research.pollTask(task.id);

    // TypeScript knows this is AIResearchOverview type!
    const research = finalTask.data as z.infer<typeof AIResearchOverview>;

    console.log("Breakthrough Papers:");
    research.breakthrough_papers.forEach((paper) => {
      console.log(`  • ${paper.title}`);
      console.log(`    Authors: ${paper.authors.join(", ")}`);
      console.log(`    Key Contribution: ${paper.key_contribution}`);
    });

    console.log("\nLeading Researchers:");
    research.leading_researchers.forEach((researcher) => {
      console.log(`  • ${researcher.name} (${researcher.affiliation})`);
      console.log(`    Expertise: ${researcher.expertise}`);
      if (researcher.notable_work) {
        console.log(`    Notable Work: ${researcher.notable_work.join(", ")}`);
      }
    });

    console.log("\nCommercial Applications:");
    research.commercial_applications.forEach((app) => {
      console.log(`  • ${app.application_area}: ${app.description}`);
      if (app.companies) {
        console.log(`    Companies: ${app.companies.join(", ")}`);
      }
    });
  } catch (error) {
    console.error("Error in AI research exploration:", error);
  }
}

async function demonstrateCustomResearch() {
  console.log("\n\nExample 4: Custom Research Analysis");
  console.log("=".repeat(40));

  try {
    // Create the research task
    const task = await exa.research.createTask({
      instructions:
        "autonomous vehicle technology development, key players, and market outlook",
      output: {
        schema: TechnologyLandscape,
      },
      model: "exa-research",
    });

    console.log(`Created task ${task.id}, polling for completion...`);

    // Poll until completion
    const finalTask = await exa.research.pollTask(task.id);

    // TypeScript knows this is TechnologyLandscape type!
    const analysis = finalTask.data as z.infer<typeof TechnologyLandscape>;

    console.log("Emerging Technologies in Autonomous Vehicles:");
    analysis.emerging_technologies.forEach((tech) => {
      console.log(`  • ${tech.name}: ${tech.description}`);
      if (tech.key_players) {
        console.log(`    Key Players: ${tech.key_players.join(", ")}`);
      }
    });

    console.log("\nMarket Leaders:");
    analysis.market_leaders.forEach((company) => {
      console.log(`  • ${company.name} (${company.industry})`);
      if (company.funding_amount) {
        console.log(`    Funding: ${company.funding_amount}`);
      }
    });

    console.log("\nInvestment Trends:");
    analysis.investment_trends.forEach((trend) => {
      console.log(`  • ${trend.title}: ${trend.summary}`);
    });
  } catch (error) {
    console.error("Error in custom research:", error);
  }
}

// ===============================================
// Main Function
// ===============================================

async function main() {
  console.log("🚀 Zod Research Integration Examples\n");

  await analyzeTechnologyLandscape();
  await researchStartupEcosystem();
  await exploreAIResearch();
  await demonstrateCustomResearch();

  console.log("\n✅ All research examples completed!");
}

// Export schemas and functions for use in other examples
export {
  TechnologyLandscape,
  StartupEcosystem,
  AIResearchOverview,
  TechnologyInfo,
  CompanyProfile,
  ResearchInsight,
  main as runResearchExamples,
};

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}
