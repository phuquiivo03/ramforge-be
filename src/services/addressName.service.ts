import { AddressName, IAddressName } from "../models/addressName.model";
import { resolveBasenameToAddress } from "./utils";

export class AddressNameService {
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
