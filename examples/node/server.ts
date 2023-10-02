import express, { Express, Request, Response } from "express";
import Metaphor from "metaphor-node";

const metaphorClient = new Metaphor(process.env.METAPHOR_API_KEY!);

const app: Express = express();
const port = 8000;

app.get("/", (req: Request, res: Response) => {
  const mres = metaphorClient.search("hottest ai startup");
  console.log(mres);
  res.send("Express + TypeScript Server");
});

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
