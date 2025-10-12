import express from "express";
import indexRoute from "./routes/index.route";
import cors from "cors";
import { resolveAddressToBasename, resolveBasenameToAddress } from "./services/utils";

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
app.use("/", indexRoute);

export default app;
