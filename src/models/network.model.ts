import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface NetworkDocument extends Document {
  builder: Types.ObjectId;
  connections: Types.ObjectId[];
  created_at: Date;
  updated_at: Date;
}

const NetworkSchema = new Schema<NetworkDocument>(
  {
    builder: { type: Schema.Types.ObjectId, ref: "Builder", required: true, unique: true },
    connections: { type: [Schema.Types.ObjectId], ref: "Builder", required: true, default: [] },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" }, versionKey: false },
);

export const Network: Model<NetworkDocument> =
  mongoose.models.Network || mongoose.model<NetworkDocument>("Network", NetworkSchema);
