import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { swaggerUI } from "@hono/swagger-ui";

const app = new Hono();

app.get(
  "/",
  swaggerUI({
    url: "https://raw.githubusercontent.com/CarlosZiegler/exa-js/dev/openapi.yaml",
  })
);

const port = 3000;
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});
