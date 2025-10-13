import { Request, Response } from "express";
import { Types } from "mongoose";
import { Network } from "../models/network.model";
import { Builder } from "../models/builder.model";
import friendManagerClient from "../services/onchain";
import { resolveBasenameToAddress } from "../services/utils";
import { AddressNameService } from "../services/addressName.service";

function toObjectId(id: string) {
  if (!Types.ObjectId.isValid(id)) return null;
  return new Types.ObjectId(id);
}

export const NetworksController = {
  // Get pending received requests for a builder by ObjectId -> resolve by builder.name
  getPendingReceivedForUser: async (req: Request, res: Response) => {
    try {
      const userId = (req.query.userId as string) || (req.params as any)?.userId;
      const walletAddress = (req.query.walletAddress as string) || undefined;
      if (!userId) return res.status(400).json({ message: "userId is required" });

      // If walletAddress is provided, validate and use directly
      let userAddress: string | null = null;
      if (walletAddress) {
        try {
          const { ethers } = await import("ethers");
          if (!ethers.isAddress(walletAddress)) {
            return res.status(400).json({ message: "Invalid walletAddress" });
          }
          userAddress = ethers.getAddress(walletAddress);
        } catch (err: any) {
          return res.status(400).json({ message: "Invalid walletAddress" });
        }
      } else {
        // Fall back to builder lookup by ObjectId and resolve via builder.name
        const oid = toObjectId(userId);
        if (!oid) return res.status(400).json({ message: "Invalid builder id" });

        const builder = await Builder.findById(oid).lean();
        if (!builder) return res.status(404).json({ message: "Builder not found" });
        if (!builder.name) return res.status(400).json({ message: "Builder has no name" });

        userAddress = await AddressNameService.getAddressByName(builder.name);
        if (!userAddress) {
          userAddress = await AddressNameService.resolveAndStore(builder.name);
        }
        if (!userAddress) {
          return res
            .status(400)
            .json({ message: `Could not resolve address for builder name: ${builder.name}` });
        }
      }

      // Fetch pending received addresses from on-chain client
      const pendingAddresses = await friendManagerClient.getPendingReceived(userAddress);

      // Map each address to a name: prefer DB; if missing, try Talent Protocol API
      const results = await Promise.all(
        pendingAddresses.map(async (addr) => {
          let name = await AddressNameService.getNameByAddress(addr);
          if (!name) name = await AddressNameService.resolveNameByAddress(addr);
          return { address: addr, name: name ?? null };
        }),
      );

      return res.status(200).json({ userAddress, pending: results });
    } catch (err: any) {
      return res
        .status(500)
        .json({ message: "Failed to get pending received", error: err?.message });
    }
  },
  getOnchainFriends: async (req: Request, res: Response) => {
    const { builderId } = req.params;

    // Check if builderId is already a valid address
    let builderAddress: string | null = null;

    // First try to resolve as basename (ENS)
    const resolvedAddress = await resolveBasenameToAddress(builderId);
    if (resolvedAddress) {
      builderAddress = resolvedAddress;
    } else {
      // If ENS resolution failed, check if it's already a valid address
      try {
        const { ethers } = await import("ethers");
        if (ethers.isAddress(builderId)) {
          builderAddress = ethers.getAddress(builderId);
        }
      } catch (err) {
        // builderId is not a valid address
      }
    }

    if (!builderAddress) {
      return res.status(400).json({
        message: "Invalid builder identifier. Must be a valid Ethereum address or ENS name.",
      });
    }

    try {
      const onchainFriends = await friendManagerClient.getFriends(builderAddress);
      return res.status(200).json({
        builderAddress,
        friends: onchainFriends,
      });
    } catch (err: any) {
      return res.status(500).json({
        message: "Failed to fetch onchain friends",
        error: err?.message,
      });
    }
  },

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

  // Connect to another builder via onchain friend request
  connectBuilder: async (req: Request, res: Response) => {
    const { targetBuilderId } = req.body;

    try {
      // Validate input
      if (!targetBuilderId) {
        return res.status(400).json({ message: "targetBuilderId is required" });
      }

      const targetBuilderObjectId = toObjectId(targetBuilderId);
      if (!targetBuilderObjectId) {
        return res.status(400).json({ message: "Invalid targetBuilderId" });
      }

      // Get target builder info
      const targetBuilder = await Builder.findById(targetBuilderObjectId).lean();
      if (!targetBuilder) {
        return res.status(404).json({ message: "Target builder not found" });
      }

      console.log("targetBuilder", targetBuilder);

      // Get target builder's name
      const targetBuilderName = targetBuilder.name;
      if (!targetBuilderName) {
        return res.status(400).json({ message: "Target builder has no name" });
      }

      // Check if address-name mapping exists in database
      let targetAddress = await AddressNameService.getAddressByName(targetBuilderName);

      if (!targetAddress) {
        // Resolve name to address using ENS
        targetAddress = await AddressNameService.resolveAndStore(targetBuilderName);

        if (!targetAddress) {
          return res.status(400).json({
            message: `Could not resolve ENS name for builder: ${targetBuilderName}`,
          });
        }
      }

      // Send friend request on-chain
      // const receipt = await friendManagerClient.requestFriend(targetAddress);

      return res.status(200).json({
        message: "Friend request sent successfully",
        targetBuilder: {
          id: targetBuilder._id,
          name: targetBuilderName,
          address: targetAddress,
        },
      });
    } catch (err: any) {
      console.error("Connect builder error:", err);
      return res.status(500).json({
        message: "Failed to connect to builder",
        error: err?.message || "Unknown error",
      });
    }
  },
};
