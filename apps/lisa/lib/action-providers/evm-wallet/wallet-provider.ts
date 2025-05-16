import { ActionProvider, WalletProvider, Network } from "@coinbase/agentkit";
import { z } from "zod";
import { mnemonicToAccount, generateMnemonic, english } from "viem/accounts";
import { base } from "viem/chains";
import {
	CreateWalletSchema,
	GetWalletSchema,
	ListWalletsSchema,
} from "./schema";
import redis from "@/lib/redis";

// Function to extract the base userId from full userId
function getBaseUserId(userId: string): string {
	const parts = userId.split("-");
	if (parts.length > 1) {
		return parts[0];
	}
	return userId;
}

// Wallet provider class
class EVMWalletManagementProvider extends ActionProvider<WalletProvider> {
	constructor() {
		super("evm-wallet-management", []);
	}

	// Create a new wallet for the user
	async createWallet(
		walletProvider: WalletProvider,
		args: z.infer<typeof CreateWalletSchema>,
	): Promise<string> {
		try {
			if (!redis) {
				return JSON.stringify(
					{
						success: false,
						error:
							"Redis connection not available. Check environment variables.",
					},
					null,
					2,
				);
			}

			const { userId } = args;
			const baseId = getBaseUserId(userId);

			// Check if any wallets exist for this user
			const existingWallets = await redis.keys(`${baseId}-*-wallet`);

			// Determine the next wallet number
			let walletNumber = 1;
			if (existingWallets.length > 0) {
				const walletNumbers = existingWallets.map((key) => {
					const match = key.match(new RegExp(`${baseId}-(\\d+)-wallet`));
					return match ? parseInt(match[1], 10) : 0;
				});
				walletNumber = Math.max(...walletNumbers) + 1;
			}

			// Generate a new mnemonic phrase (seed phrase)
			const mnemonic = generateMnemonic(english);

			// Create an account from the mnemonic
			const account = mnemonicToAccount(mnemonic);

			// Store the mnemonic in Redis
			const walletKey = `${baseId}-${walletNumber}-wallet`;
			await redis.set(
				walletKey,
				JSON.stringify({
					mnemonic,
					address: account.address,
					createdAt: new Date().toISOString(),
				}),
			);

			return JSON.stringify(
				{
					success: true,
					walletId: walletKey,
					address: account.address,
					walletNumber: walletNumber,
					mnemonic: mnemonic, // In production, you might not want to return this
					message: `Wallet #${walletNumber} created successfully for user ${baseId}`,
				},
				null,
				2,
			);
		} catch (error: unknown) {
			const err = error as { message?: string };
			return JSON.stringify(
				{
					success: false,
					error: err.message || "Unknown error occurred while creating wallet",
				},
				null,
				2,
			);
		}
	}

	// Get an existing wallet
	async getWallet(
		walletProvider: WalletProvider,
		args: z.infer<typeof GetWalletSchema>,
	): Promise<string> {
		try {
			if (!redis) {
				return JSON.stringify(
					{
						success: false,
						error:
							"Redis connection not available. Check environment variables.",
					},
					null,
					2,
				);
			}

			const { userId } = args;

			// Create the wallet key
			const walletKey = `${userId}-wallet`;

			// Retrieve the wallet from Redis
			const walletData = await redis.get(walletKey);

			if (!walletData) {
				return JSON.stringify(
					{
						success: false,
						error: `No wallet found for ${userId}`,
					},
					null,
					2,
				);
			}

			const wallet = JSON.parse(walletData as string);

			return JSON.stringify(
				{
					success: true,
					walletId: walletKey,
					address: wallet.address,
					mnemonic: wallet.mnemonic, // In production, you might not want to return this
					createdAt: wallet.createdAt,
				},
				null,
				2,
			);
		} catch (error: unknown) {
			const err = error as { message?: string };
			return JSON.stringify(
				{
					success: false,
					error:
						err.message || "Unknown error occurred while retrieving wallet",
				},
				null,
				2,
			);
		}
	}

	// List all wallets for a user
	async listWallets(
		walletProvider: WalletProvider,
		args: z.infer<typeof ListWalletsSchema>,
	): Promise<string> {
		try {
			if (!redis) {
				return JSON.stringify(
					{
						success: false,
						error:
							"Redis connection not available. Check environment variables.",
					},
					null,
					2,
				);
			}

			const { userId } = args;

			// Retrieve all wallet keys for this user
			const walletKeys = await redis.keys(`${userId}-*-wallet`);

			if (walletKeys.length === 0) {
				return JSON.stringify(
					{
						success: true,
						wallets: [],
						message: `No wallets found for user ${userId}`,
					},
					null,
					2,
				);
			}

			// Retrieve each wallet
			const wallets = await Promise.all(
				walletKeys.map(async (key) => {
					const walletData = await redis.get(key);
					if (!walletData) return null;

					const wallet = JSON.parse(walletData as string);
					const match = key.match(new RegExp(`${userId}-(\\d+)-wallet`));
					const walletNumber = match ? parseInt(match[1], 10) : 0;

					return {
						walletId: key,
						walletNumber,
						address: wallet.address,
						createdAt: wallet.createdAt,
					};
				}),
			);

			// Filter out any nulls and sort by wallet number
			const validWallets = wallets
				.filter((w) => w !== null)
				.sort((a, b) => a!.walletNumber - b!.walletNumber);

			return JSON.stringify(
				{
					success: true,
					wallets: validWallets,
					count: validWallets.length,
				},
				null,
				2,
			);
		} catch (error: unknown) {
			const err = error as { message?: string };
			return JSON.stringify(
				{
					success: false,
					error: err.message || "Unknown error occurred while listing wallets",
				},
				null,
				2,
			);
		}
	}

	// Define which networks this action provider supports
	supportsNetwork(network: Network): boolean {
		// Only support Base for now
		return network.chainId !== undefined && Number(network.chainId) === base.id;
	}

	// Register the available actions
	getActions(walletProvider: WalletProvider) {
		return [
			{
				name: "create_wallet",
				description: "Create a new wallet for a user",
				schema: CreateWalletSchema,
				invoke: (args: z.infer<typeof CreateWalletSchema>) =>
					this.createWallet(walletProvider, args),
			},
			{
				name: "get_wallet",
				description: "Get an existing wallet for a user",
				schema: GetWalletSchema,
				invoke: (args: z.infer<typeof GetWalletSchema>) =>
					this.getWallet(walletProvider, args),
			},
			{
				name: "list_wallets",
				description: "List all wallets for a user",
				schema: ListWalletsSchema,
				invoke: (args: z.infer<typeof ListWalletsSchema>) =>
					this.listWallets(walletProvider, args),
			},
		];
	}
}

// Export the provider
export const evmWalletManagementProvider = () => new EVMWalletManagementProvider();
