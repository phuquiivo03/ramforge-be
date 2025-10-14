import { Request, Response } from "express";
import { Types } from "mongoose";
import { RequestModel } from "../models/request.model";

function toObjectId(id: string) {
  if (!Types.ObjectId.isValid(id)) return null;
  return new Types.ObjectId(id);
}

export const RequestsController = {
  create: async (req: Request, res: Response) => {
    try {
      const { sender, receiver } = req.body as { sender: string; receiver: string };
      const senderId = toObjectId(sender);
      const receiverId = toObjectId(receiver);
      if (!senderId || !receiverId) return res.status(400).json({ message: "Invalid ids" });

      const doc = await RequestModel.create({ sender: senderId, receiver: receiverId });
      const populated = await doc.populate([{ path: "sender", model: "Builder" }, { path: "receiver", model: "Builder" }]);
      return res.status(201).json(populated);
    } catch (err: any) {
      return res.status(400).json({ message: err?.message || "Failed to create request" });
    }
  },

  list: async (req: Request, res: Response) => {
    try {
      const page = Math.max(1, Number(req.query.page ?? 1));
      const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 20)));
      const filter: Record<string, any> = {};
      if (req.query.sender) {
        const id = toObjectId(String(req.query.sender));
        if (!id) return res.status(400).json({ message: "Invalid sender id" });
        filter.sender = id;
      }
      if (req.query.receiver) {
        const id = toObjectId(String(req.query.receiver));
        if (!id) return res.status(400).json({ message: "Invalid receiver id" });
        filter.receiver = id;
      }
      if (req.query.status) {
        filter.status = String(req.query.status);
      }

      const items = await RequestModel.find(filter)
        .populate([{ path: "sender", model: "Builder" }, { path: "receiver", model: "Builder" }])
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();
      const total = await RequestModel.countDocuments(filter);
      return res.json({ page, limit, total, items });
    } catch (err: any) {
      return res.status(500).json({ message: "Failed to list requests", error: err?.message });
    }
  },

  getOne: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const oid = toObjectId(id);
      if (!oid) return res.status(400).json({ message: "Invalid id" });
      const doc = await RequestModel.findById(oid)
        .populate([{ path: "sender", model: "Builder" }, { path: "receiver", model: "Builder" }])
        .lean();
      if (!doc) return res.status(404).json({ message: "Not found" });
      return res.json(doc);
    } catch (err: any) {
      return res.status(500).json({ message: "Failed to get request", error: err?.message });
    }
  },

  updateStatus: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body as { status: "pending" | "accepted" | "canceled" };
      if (!status || !["pending", "accepted", "canceled"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      const oid = toObjectId(id);
      if (!oid) return res.status(400).json({ message: "Invalid id" });
      const doc = await RequestModel.findByIdAndUpdate(oid, { $set: { status } }, { new: true })
        .populate([{ path: "sender", model: "Builder" }, { path: "receiver", model: "Builder" }])
        .lean();
      if (!doc) return res.status(404).json({ message: "Not found" });
      return res.json(doc);
    } catch (err: any) {
      return res.status(400).json({ message: err?.message || "Failed to update status" });
    }
  },
};


