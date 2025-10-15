// getAddressFromBasename.ts
import { createHash, randomBytes } from "crypto";
import { createPublicClient, http, getAddress, isAddress } from "viem";
import { mainnet, base, baseSepolia } from "viem/chains";

const BASE_RPC = process.env.BASE_RPC || "https://mainnet.base.org"; // or Sepolia RPC

// Create clients for different networks
const mainnetClient = createPublicClient({
  chain: mainnet,
  transport: http(),
});

const baseClient = createPublicClient({
  chain: base,
  transport: http(BASE_RPC),
});

/**
 * Resolve a basename (e.g. "alice.base") -> address
 * @returns address string or null if not found
 */
export async function resolveBasenameToAddress(name: string): Promise<string | null> {
  if (!name || typeof name !== "string") throw new Error("name required");

  try {
    // Check if it's already a valid address
    if (isAddress(name)) {
      return getAddress(name);
    }

    // Auto-append .eth if no TLD is present
    let ensName = name.trim();
    if (!ensName.includes(".")) {
      ensName = `${ensName}.eth`;
      console.log(`Auto-appending .eth: ${name} -> ${ensName}`);
    }

    // Determine which client to use based on RPC URL
    // Select ENS-capable client (only mainnet supports native ENS)
    let client = mainnetClient;

    // Try to resolve ENS name
    try {
      const address = await client.getEnsAddress({ name: ensName });
      return address; // null if not found
    } catch (err) {
      console.log(`ENS resolution failed for ${ensName}:`, (err as Error).message);
      return null;
    }
  } catch (err) {
    console.error("resolve error", err);
    return null;
  }
}

/**
 * Resolve an address -> basename (ENS name)
 * @param address - Ethereum address to resolve
 * @returns ENS name string or null if not found
 */
export async function resolveAddressToBasename(address: string): Promise<string | null> {
  console.log("resolveAddressToBasename", address);
  if (!address || typeof address !== "string") throw new Error("address required");

  try {
    // Validate and normalize the address
    if (!isAddress(address)) {
      throw new Error("Invalid address format");
    }
    const normalizedAddress = getAddress(address);

    // Use mainnet client for ENS reverse resolution
    try {
      const ensName = await mainnetClient.getEnsName({ address: normalizedAddress });
      return ensName; // null if not found
    } catch (err) {
      console.log(
        `ENS reverse resolution failed for ${normalizedAddress}:`,
        (err as Error).message,
      );
      return null;
    }
  } catch (err) {
    console.error("reverse resolve error", err);
    return null;
  }
}

export function generateCodeChallenge() {
  const verifier = randomBytes(32).toString("base64url");
  return createHash("sha256").update(verifier).digest("base64url");
}

// Test function to verify Viem setup
async function check() {
  try {
    // Test address validation
    const testAddress = "0xB6d00D83158feE6695C72ff9c5E915478A479224";
    console.log("Testing address validation:", isAddress(testAddress));

    // Test ENS resolution on mainnet (name -> address)
    try {
      const ensResult = await mainnetClient.getEnsAddress({ name: "juliomcruz.eth" });
      console.log("ENS resolution on mainnet:", ensResult);

      // Test reverse resolution (address -> name) if we got an address
      if (ensResult) {
        const reverseResult = await mainnetClient.getEnsName({ address: ensResult });
        console.log("ENS reverse resolution:", reverseResult);
      }
    } catch (err) {
      console.log("ENS resolution on mainnet failed:", (err as Error).message);
    }

    // Test our utility functions
    try {
      console.log("\n--- Testing resolveBasenameToAddress ---");

      // Test with .eth suffix
      const basenameResult = await resolveBasenameToAddress("juliomcruz");
      console.log("resolveBasenameToAddress('devrel.base.eth') result:", basenameResult);

      // Test without .eth suffix (should auto-append)
      const basenameResultNoEth = await resolveBasenameToAddress("vitalik");
      console.log("resolveBasenameToAddress('vitalik') result:", basenameResultNoEth);

      if (basenameResult) {
        console.log("\n--- Testing resolveAddressToBasename ---");
        const addressResult = await resolveAddressToBasename(basenameResult);
        console.log("resolveAddressToBasename result:", addressResult);

        // Debug: Check if the names match
        console.log("\n--- Debug: Name comparison ---");
        console.log("Original name: devq0x7zzz.base.eth");
        console.log("Resolved address:", basenameResult);
        console.log("Reverse resolved name:", addressResult);
        console.log("Names match:", "devq0x7zzz.base.eth" === addressResult);

        // Test with the specific address you mentioned
        console.log("\n--- Testing specific address ---");
        const specificAddress = "0x291AdC431AE72559BF1814c2041dA45E81751E9c";
        const specificResult = await resolveAddressToBasename(specificAddress);
        console.log(`Address ${specificAddress} resolves to:`, specificResult);

        // Test forward resolution of the specific address
        if (specificResult) {
          const forwardResult = await resolveBasenameToAddress(specificResult);
          console.log(`Name ${specificResult} resolves to:`, forwardResult);
          console.log("Round trip successful:", forwardResult === specificAddress);
        }
      }
    } catch (err) {
      console.log("Utility function test failed:", (err as Error).message);
    }

    // Test Base network detection
    const isBaseNetwork = BASE_RPC.includes("base.org");
    console.log("\nUsing Base network:", isBaseNetwork);

    if (isBaseNetwork) {
      console.log("Skipping ENS resolution test on Base network");
    }
  } catch (err) {
    console.error("Check function error:", (err as Error).message);
  }
}
