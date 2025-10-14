import express from "express";
import indexRoute from "./routes/index.route";
import cors from "cors";
import { resolveAddressToBasename, resolveBasenameToAddress } from "./services/utils";
import friendManagerClient from "./services/onchain";
import { openApiSpec } from "./docs/openapi";

const app = express();

app.use(
  cors({
    origin: "*",
    credentials: true,
  }),
);
app.use(express.json());

app.get("/", async (req, res) => {
  res.send(`Hello World`);
});

// Serve OpenAPI spec
app.get("/openapi.json", (req, res) => {
  res.json(openApiSpec);
});

// Simple Swagger UI via CDN
app.get("/docs", (req, res) => {
  res.type("html").send(`<!doctype html>
<html>
  <head>
    <title>Ramforge API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: '/openapi.json',
        dom_id: '#swagger',
      });
    </script>
  </body>
  </html>`);
});
app.use("/", indexRoute);

export default app;
