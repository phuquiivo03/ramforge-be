import dotenv from "dotenv";

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 3003),
  mongoUri: process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017/ramforge",
} as const;
