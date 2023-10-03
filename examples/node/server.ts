import express, { Express, Request, Response } from "express";
import Metaphor from "metaphor-node";

const metaphorClient = new Metaphor(process.env.METAPHOR_API_KEY!);

const app: Express = express();
const port = 8000;

app.get("/", async (req: Request, res: Response) => {
  const metaphorRes = await metaphorClient.search(
    "If you're looking for the hottest AI agent startup, check this out:"
  );

  res.json(metaphorRes);
});

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
