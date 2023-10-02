import { NextResponse } from "next/server";
import Metaphor from "jiito-kowalski-node";

export async function GET(req: NextResponse) {
  const metaphor = new Metaphor("fcac2ebb-a2fe-4348-bf45-7470298f0055");
  const res = await metaphor.search("hottest ai startups");

  return NextResponse.json(res);
}
