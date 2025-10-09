import { ethers } from "ethers";
import abi from "../abi/FriendManager.json";
import { env } from "../config/env";

export function getProvider(rpcUrl: string): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(rpcUrl);
}

export function getWallet(privateKey: string, provider: ethers.JsonRpcProvider): ethers.Wallet {
  return new ethers.Wallet(privateKey, provider);
}

export function getContract(address: string, wallet: ethers.Wallet): ethers.Contract {
  return new ethers.Contract(address, (abi as any).abi, wallet);
}

class FriendManagerClient {
  readonly contract: ethers.Contract;

  constructor(contractAddress: string, wallet: ethers.Wallet) {
    this.contract = getContract(requireAddress(contractAddress, "contractAddress"), wallet);
  }

  async requestFriend(to: string): Promise<ethers.TransactionReceipt> {
    const toAddr = requireAddress(to, "to");
    const tx = await this.contract.requestFriend(toAddr);
    return await tx.wait();
  }

  async cancelRequest(to: string): Promise<ethers.TransactionReceipt> {
    const toAddr = requireAddress(to, "to");
    const tx = await this.contract.cancelRequest(toAddr);
    return await tx.wait();
  }

  async rejectRequest(from: string): Promise<ethers.TransactionReceipt> {
    const fromAddr = requireAddress(from, "from");
    const tx = await this.contract.rejectRequest(fromAddr);
    return await tx.wait();
  }

  async acceptRequest(requester: string): Promise<ethers.TransactionReceipt> {
    const reqAddr = requireAddress(requester, "requester");
    const tx = await this.contract.acceptRequest(reqAddr);
    return await tx.wait();
  }

  async removeFriend(who: string): Promise<ethers.TransactionReceipt> {
    const whoAddr = requireAddress(who, "who");
    const tx = await this.contract.removeFriend(whoAddr);
    return await tx.wait();
  }

  async areFriends(a: string, b: string): Promise<boolean> {
    const aAddr = requireAddress(a, "a");
    const bAddr = requireAddress(b, "b");
    return await this.contract.areFriends(aAddr, bAddr);
  }

  async friendsCount(user: string): Promise<bigint> {
    const userAddr = requireAddress(user, "user");
    const count: bigint = await this.contract.friendsCount(userAddr);
    return count;
  }

  async getFriends(user: string): Promise<string[]> {
    const userAddr = requireAddress(user, "user");
    return await this.contract.getFriends(userAddr);
  }

  async pendingSentCount(user: string): Promise<bigint> {
    const userAddr = requireAddress(user, "user");
    const count: bigint = await this.contract.pendingSentCount(userAddr);
    return count;
  }

  async getPendingSent(user: string): Promise<string[]> {
    const userAddr = requireAddress(user, "user");
    return await this.contract.getPendingSent(userAddr);
  }

  async pendingRecvCount(user: string): Promise<bigint> {
    const userAddr = requireAddress(user, "user");
    const count: bigint = await this.contract.pendingRecvCount(userAddr);
    return count;
  }

  async getPendingReceived(user: string): Promise<string[]> {
    const userAddr = requireAddress(user, "user");
    return await this.contract.getPendingReceived(userAddr);
  }
}

function requireAddress(value: string, label: string): string {
  const v = (value ?? "").trim();
  if (!ethers.isAddress(v)) {
    throw new Error(`Invalid ${label} address: ${value}`);
  }
  return ethers.getAddress(v);
}

function getFriendManagerClient(
  rpcUrl: string,
  privateKey: string,
  contractAddress: string,
): FriendManagerClient {
  const provider = getProvider(rpcUrl);
  const wallet = getWallet(privateKey, provider);
  return new FriendManagerClient(contractAddress, wallet);
}

const friendManagerClient = getFriendManagerClient(env.rpcUrl, env.privateKey, env.contractAddress);
export default friendManagerClient;
