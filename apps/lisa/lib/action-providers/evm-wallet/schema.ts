import { z } from "zod";

//creatiing new wallet
export const CreateWalletSchema = z.object({
	userId: z
		.string()
		.describe("User ID to create wallet for (e.g., 'phoneId-1')"),
});

// Schema for retrieving an existing wallet
export const GetWalletSchema = z.object({
	userId: z
		.string()
		.describe("User ID to retrieve wallet for (e.g., 'phoneId-1')"),
});

// Schema for listing all wallets for a user
export const ListWalletsSchema = z.object({
	userId: z
		.string()
		.describe("Base User ID to list wallets for (e.g., 'phoneId')"),
});
