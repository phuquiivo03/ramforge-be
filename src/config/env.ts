import dotenv from "dotenv";

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 3003),
  mongoUri: process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017/ramforge",
  contractAddress: process.env.CONTRACT_ADDRESS ?? "",
  rpcUrl: process.env.RPC_URL ?? "",
  privateKey: process.env.PRIVATE_KEY ?? "",
} as const;
