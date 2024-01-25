import express, { Express, Request, Response } from "express";
import Exa from "exa-js";

const exa = new Exa(process.env.EXA_API_KEY!);

const app: Express = express();
const port = 8000;

app.get("/", async (req: Request, res: Response) => {
  const exaRes = await exa.search(
    "If you're looking for the hottest AI agent startup, check this out:"
  );

  res.json(exaRes);
});

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
