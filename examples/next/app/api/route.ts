import { NextResponse } from "next/server";
import Metaphor from "metaphor-node";

export async function GET(req: NextResponse) {
  const metaphor = new Metaphor(process.env.METAPHOR_API_KEY!);
  const res = await metaphor.search("hottest ai startups");

  return NextResponse.json(res);
}
