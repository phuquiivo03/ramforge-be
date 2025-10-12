import mongoose, { Schema, Document } from "mongoose";

export interface IAddressName extends Document {
  address: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const AddressNameSchema = new Schema<IAddressName>(
  {
    address: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

// Compound index for efficient lookups
AddressNameSchema.index({ address: 1, name: 1 });

export const AddressName = mongoose.model<IAddressName>("AddressName", AddressNameSchema);
