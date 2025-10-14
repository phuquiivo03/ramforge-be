import mongoose, { Schema, Document, Model, Types } from "mongoose";
import { BuilderDocument } from "./builder.model";

export type RequestStatus = "pending" | "accepted" | "canceled";

export interface RequestDocument extends Document {
  sender: Types.ObjectId | BuilderDocument; // ref Builder
  receiver: Types.ObjectId | BuilderDocument; // ref Builder
  status: RequestStatus;
  createdAt: Date;
  updatedAt: Date;
}

const RequestSchema = new Schema<RequestDocument>(
  {
    sender: { type: Schema.Types.ObjectId, ref: "Builder", required: true, index: true },
    receiver: { type: Schema.Types.ObjectId, ref: "Builder", required: true, index: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "canceled"],
      required: true,
      default: "pending",
      index: true,
    },
  },
  { timestamps: true, versionKey: false },
);

RequestSchema.index({ sender: 1, receiver: 1 }, { unique: true });

export const RequestModel: Model<RequestDocument> =
  mongoose.models.Request || mongoose.model<RequestDocument>("Request", RequestSchema);


