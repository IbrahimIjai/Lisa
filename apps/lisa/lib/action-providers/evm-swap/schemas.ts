import { z } from "zod";

export const SwapQuoteSchema = z.object({
	sellToken: z
		.string()
		.describe(
			"Address or symbol of the token to sell (e.g., ETH, WETH, 0x...)",
		),
	buyToken: z
		.string()
		.describe("Address or symbol of the token to buy (e.g., DAI, USDC, 0x...)"),
	sellAmount: z
		.string()
		.describe("Amount of sellToken to sell in wei/smallest unit"),
	chainId: z
		.number()
		.optional()
		.describe(
			"Chain ID for the network (optional, defaults to current network)",
		),
});

export const ExecuteSwapSchema = z.object({
	sellToken: z
		.string()
		.describe(
			"Address or symbol of the token to sell (e.g., ETH, WETH, 0x...)",
		),
	buyToken: z
		.string()
		.describe("Address or symbol of the token to buy (e.g., DAI, USDC, 0x...)"),
	sellAmount: z
		.string()
		.describe("Amount of sellToken to sell in wei/smallest unit"),
	slippagePercentage: z
		.number()
		.default(1)
		.describe("Slippage tolerance percentage (default: 1%)"),
	chainId: z
		.number()
		.optional()
		.describe(
			"Chain ID for the network (optional, defaults to current network)",
		),
});

export const TokenAllowanceSchema = z.object({
	tokenAddress: z
		.string()
		.describe("Address of the token to check allowance for"),
	spenderAddress: z
		.string()
		.optional()
		.describe(
			"Address of the spender (optional, defaults to 0x Exchange Proxy)",
		),
	amount: z.string().describe("Amount that needs to be approved"),
	chainId: z
		.number()
		.optional()
		.describe(
			"Chain ID for the network (optional, defaults to current network)",
		),
});
