import mongoose from "mongoose";
import { env } from "./env";
export async function connectToDatabase(): Promise<void> {
  await mongoose
    .connect(env.mongoUri, {
      dbName: "ramfroge",
    })
    .then(() => {
      console.log("Connected to database");
    })
    .catch((err) => {
      console.error("Error connecting to database", err);
    });
}
