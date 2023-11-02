import Metaphor from "metaphor-node";

export async function GET() {
  const metaphor = new Metaphor(process.env.METAPHOR_API_KEY!);
  const results = await metaphor.search("hottest ai startups");

  return Response.json({ results });
}
