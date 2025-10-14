import { AddressName, IAddressName } from "../models/addressName.model";
import { resolveBasenameToAddress } from "./utils";
import { env } from "../config/env";
import { Builder } from "../models/builder.model";

export class AddressNameService {
  /**
   * Ensure a Builder exists for the given name. If not, create with a random valid location.
   */
  static async ensureBuilderForName(name: string) {
    const existing = await Builder.findOne({ name });
    if (existing) return existing;

    // Generate a random valid [longitude, latitude]
    const randomLongitude = Math.random() * 360 - 180;
    const randomLatitude = Math.random() * 180 - 90;

    return await Builder.create({ name, location: [randomLongitude, randomLatitude] });
  }
  /**
   * Get address by name from database
   */
  static async getAddressByName(name: string): Promise<string | null> {
    const record = await AddressName.findOne({ name }).lean();
    return record?.address || null;
  }

  /**
   * Get name by address from database
   */
  static async getNameByAddress(address: string): Promise<string | null> {
    const record = await AddressName.findOne({ address }).lean();
    return record?.name || null;
  }

  /**
   * Resolve a display name (basename) for an address using Talent Protocol API and cache it.
   */
  static async resolveNameByAddress(address: string): Promise<string | null> {
    // Check DB first
    const existing = await this.getNameByAddress(address);
    if (existing) return existing;
    console.log("finding name by address", address);

    // Query Talent Protocol API
    if (!env.talentApiKey) return null;
    console.log("talentApiKey", env.talentApiKey);
    try {
      const query = encodeURIComponent(JSON.stringify({ identity: address, exactMatch: false }));
      console.log("query", query);
      const url = `https://api.talentprotocol.com/search/advanced/profiles?query=${query}`;
      const resp = await fetch(url, {
        method: "GET",
        headers: {
          "x-api-key": env.talentApiKey,
          Accept: "application/json",
        },
      });
      if (!resp.ok) return null;
      const json = (await resp.json()) as { profiles?: Array<{ name?: string }> };
      console.log("json", json);
      if (!json?.profiles?.length) return null;
      const name = json?.profiles?.[0]?.name;
      if (name && typeof name === "string" && name.trim().length > 0) {
        await this.storeMapping(address, name);
        await this.ensureBuilderForName(name);
        return name;
      }
      await this.storeMapping(address, address);
      
      return address;
    } catch (err) {
      return null;
    }
  }

  /**
   * Store address-name mapping in database
   */
  static async storeMapping(address: string, name: string): Promise<IAddressName> {
    const existingRecord = await AddressName.findOne({ address });

    if (existingRecord) {
      // Update existing record if name is different
      if (existingRecord.name !== name) {
        existingRecord.name = name;
        await existingRecord.save();
      }
      return existingRecord;
    }

    // Create new record
    const newRecord = new AddressName({ address, name });
    await newRecord.save();
    return newRecord;
  }

  /**
   * Resolve name to address, storing the mapping if not exists
   */
  static async resolveAndStore(name: string): Promise<string | null> {
    console.log("resolveAndStore", name);
    // First check if we have it in database
    const existingAddress = await this.getAddressByName(name);
    if (existingAddress) {
      return existingAddress;
    }

    // Resolve using ENS
    const resolvedAddress = await resolveBasenameToAddress(name);
    if (!resolvedAddress) {
      return null;
    }

    // Store the mapping
    await this.storeMapping(resolvedAddress, name);
    return resolvedAddress;
  }

  /**
   * Get all address-name mappings
   */
  static async getAllMappings() {
    return await AddressName.find().lean();
  }

  /**
   * Delete a mapping by address
   */
  static async deleteByAddress(address: string): Promise<boolean> {
    const result = await AddressName.deleteOne({ address });
    return result.deletedCount > 0;
  }

  /**
   * Delete a mapping by name
   */
  static async deleteByName(name: string): Promise<boolean> {
    const result = await AddressName.deleteOne({ name });
    return result.deletedCount > 0;
  }
}
