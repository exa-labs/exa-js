import Exa from "exa-js";

export async function GET() {
  const exa = new Exa(process.env.EXA_API_KEY!);
  const results = await exa.search("hottest ai startups");

  return Response.json({ results });
}
