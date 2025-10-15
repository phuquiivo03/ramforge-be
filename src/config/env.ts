import dotenv from "dotenv";

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 3003),
  mongoUri: process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017/ramforge",
  contractAddress: process.env.CONTRACT_ADDRESS ?? "",
  rpcUrl: process.env.RPC_URL ?? "",
  privateKey: process.env.PRIVATE_KEY ?? "",
  talentApiKey: process.env.TALENT_PROTOCOL_API_KEY ?? "",
  xClientId: process.env.X_CLIENT_ID ?? "",
  xClientSecret: process.env.X_CLIENT_SECRET ?? "",
  xRedirectUri: process.env.X_REDIRECT_URI ?? "",
} as const;
