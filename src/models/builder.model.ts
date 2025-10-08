import mongoose, { Schema, Document, Model } from "mongoose";

export interface BuilderScore {
  last_calculated_at: Date;
  points: number;
  slug: string;
}

export interface BuilderDocument extends Document {
  bio?: string;
  builder_score?: BuilderScore;
  calculating_score: boolean;
  created_at: Date;
  display_name?: string;
  human_checkmark: boolean;
  image_url?: string;
  location?: [number, number];
  name: string;
  scores: BuilderScore[];
  tags: string[];
  verified_nationality: boolean;
}

const BuilderScoreSchema = new Schema<BuilderScore>(
  {
    last_calculated_at: { type: Date, required: true },
    points: { type: Number, required: true },
    slug: { type: String, required: true },
  },
  { _id: false },
);

const BuilderSchema = new Schema<BuilderDocument>(
  {
    bio: { type: String },
    builder_score: { type: BuilderScoreSchema, required: false },
    calculating_score: { type: Boolean, required: true, default: false },
    created_at: { type: Date, required: true, default: Date.now },
    display_name: { type: String },
    human_checkmark: { type: Boolean, required: true, default: false },
    image_url: { type: String },
    location: { type: [Number], validate: (v: number[]) => Array.isArray(v) && v.length === 2 },
    name: { type: String, required: true, index: true },
    scores: { type: [BuilderScoreSchema], required: true, default: [] },
    tags: { type: [String], required: true, default: [] },
    verified_nationality: { type: Boolean, required: true, default: false },
  },
  {
    timestamps: false,
    versionKey: false,
  },
);

export const Builder: Model<BuilderDocument> =
  mongoose.models.Builder || mongoose.model<BuilderDocument>("Builder", BuilderSchema);
