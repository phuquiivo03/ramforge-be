import { Request, Response } from "express";
import { Builder } from "../models/builder.model";
import { AddressNameService } from "../services/addressName.service";

export const AuthController = {
  authenticate: async (req: Request, res: Response) => {
    try {
      const walletAddress = (req.body?.walletAddress as string) || (req.query?.walletAddress as string);
      if (!walletAddress) {
        return res.status(400).json({ message: "walletAddress is required" });
      }

      // Validate and checksum address
      let checksumAddress: string | null = null;
      try {
        const { ethers } = await import("ethers");
        if (!ethers.isAddress(walletAddress)) {
          return res.status(400).json({ message: "Invalid walletAddress" });
        }
        checksumAddress = ethers.getAddress(walletAddress);
      } catch (err: any) {
        return res.status(400).json({ message: "Invalid walletAddress" });
      }

      // Resolve name for address (cached in DB or via external service)
      let name = await AddressNameService.getNameByAddress(checksumAddress!);
      if (!name) {
        name = await AddressNameService.resolveNameByAddress(checksumAddress!);
      }

      if (!name) {
        return res.status(404).json({ message: "Could not resolve name for wallet address" });
      }

      // Find or create builder by name using service to ensure valid location
      const ensured = await AddressNameService.ensureBuilderForName(name);
      const builder = await Builder.findById(ensured._id).lean();

      return res.status(200).json({ builder });
    } catch (err: any) {
      return res.status(500).json({ message: "Authentication failed", error: err?.message });
    }
  },
};


