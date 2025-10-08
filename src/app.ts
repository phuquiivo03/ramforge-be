import express from "express";
import indexRoute from "./routes/index.route";
import cors from "cors";

const app = express();

app.use(
  cors({
    origin: "*",
    credentials: true,
  }),
);
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello World");
});
app.use("/", indexRoute);

export default app;



