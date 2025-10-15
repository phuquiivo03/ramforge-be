import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface SocialConnectDocument extends Document {
  builder: Types.ObjectId;
  discord?: string;
  x?: string; // Twitter/X handle or profile URL
  xUserId?: string;
  xAccessToken?: string;
  xRefreshToken?: string;
  telegram?: string;
  github?: string;
  google?: string;
  farcaster?: string;
  wallet?: { builderWalletIndex: number; wallets: string[] };
  createdAt: Date;
  updatedAt: Date;
}

const WalletInfoSchema = new Schema<{ builderWalletIndex: number; wallets: string[] }>(
  {
    builderWalletIndex: { type: Number, required: true, default: 0 },
    wallets: { type: [String], required: true, default: [] },
  },
  { _id: false },
);

const SocialConnectSchema = new Schema<SocialConnectDocument>(
  {
    builder: {
      type: Schema.Types.ObjectId,
      ref: "Builder",
      required: true,
      index: true,
      unique: true,
    },
    discord: { type: String },
    x: { type: String },
    xUserId: { type: String },
    xAccessToken: { type: String },
    xRefreshToken: { type: String },
    telegram: { type: String },
    github: { type: String },
    google: { type: String },
    farcaster: { type: String },
    wallet: { type: WalletInfoSchema, required: false },
  },
  { timestamps: true, versionKey: false },
);

export const SocialConnect: Model<SocialConnectDocument> =
  mongoose.models.SocialConnect ||
  mongoose.model<SocialConnectDocument>("SocialConnect", SocialConnectSchema);
