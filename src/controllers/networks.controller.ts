import { Request, Response } from "express";
import { Types } from "mongoose";
import { Network } from "../models/network.model";

function toObjectId(id: string) {
  if (!Types.ObjectId.isValid(id)) return null;
  return new Types.ObjectId(id);
}

export const NetworksController = {
  // Create a network doc for a builder
  create: async (req: Request, res: Response) => {
    const { builder, connections } = req.body as { builder: string; connections?: string[] };
    const builderId = toObjectId(builder);
    if (!builderId) return res.status(400).json({ message: "Invalid builder id" });
    const connIds = Array.isArray(connections)
      ? (connections.map(toObjectId).filter(Boolean) as any)
      : [];
    try {
      const created = await Network.create({ builder: builderId, connections: connIds });
      res.status(201).json(created);
    } catch (err: any) {
      res.status(400).json({ message: err?.message || "Failed to create" });
    }
  },

  // Get a builder's network
  getOne: async (req: Request, res: Response) => {
    const { builderId } = req.params;
    const oid = toObjectId(builderId);
    if (!oid) return res.status(400).json({ message: "Invalid builder id" });
    const doc = await Network.findOne({ builder: oid })
      .populate({ path: "connections", model: "Builder" })
      .lean();
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  },

  // List networks (optional pagination)
  list: async (req: Request, res: Response) => {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 20)));
    const docs = await Network.find()
      .populate({ path: "connections", model: "Builder" })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    res.json({ page, limit, items: docs });
  },

  // Replace connections set
  setConnections: async (req: Request, res: Response) => {
    const { builderId } = req.params;
    const oid = toObjectId(builderId);
    if (!oid) return res.status(400).json({ message: "Invalid builder id" });
    const connections = Array.isArray(req.body?.connections)
      ? (req.body.connections as string[])
      : [];
    const connIds = connections.map(toObjectId).filter(Boolean) as any;
    const doc = await Network.findOneAndUpdate(
      { builder: oid },
      { $set: { connections: connIds } },
      { new: true, upsert: true },
    )
      .populate({ path: "connections", model: "Builder" })
      .lean();
    res.json(doc);
  },

  // Add one or many connections
  addConnections: async (req: Request, res: Response) => {
    const { builderId } = req.params;
    const oid = toObjectId(builderId);
    if (!oid) return res.status(400).json({ message: "Invalid builder id" });
    const connections = Array.isArray(req.body?.connections)
      ? (req.body.connections as string[])
      : [];
    const connIds = connections.map(toObjectId).filter(Boolean) as any;
    const doc = await Network.findOneAndUpdate(
      { builder: oid },
      { $addToSet: { connections: { $each: connIds } } },
      { new: true, upsert: true },
    )
      .populate({ path: "connections", model: "Builder" })
      .lean();
    res.json(doc);
  },

  // Remove one or many connections
  removeConnections: async (req: Request, res: Response) => {
    const { builderId } = req.params;
    const oid = toObjectId(builderId);
    if (!oid) return res.status(400).json({ message: "Invalid builder id" });
    const connections = Array.isArray(req.body?.connections)
      ? (req.body.connections as string[])
      : [];
    const connIds = connections.map(toObjectId).filter(Boolean) as any;
    const doc = await Network.findOneAndUpdate(
      { builder: oid },
      { $pull: { connections: { $in: connIds } } },
      { new: true },
    )
      .populate({ path: "connections", model: "Builder" })
      .lean();
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  },
};
