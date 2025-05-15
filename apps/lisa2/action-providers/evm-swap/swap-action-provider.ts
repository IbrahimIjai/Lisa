import { z } from "zod";
import { ActionProvider, WalletProvider, Network } from "@coinbase/agentkit";
import axios from "axios";
import { ExecuteSwapSchema, SwapQuoteSchema } from "./schemas";
import { TokenAllowanceSchema } from "./schemas";

// Define the base URL for 0x API
const ZERO_EX_API_URL = "https://api.0x.org";

// Map of chain IDs to their respective 0x API URLs
const CHAIN_ID_TO_ZERO_EX_API: Record<number, string> = {
	8453: "https://base.api.0x.org", // Base
};

// Default chain ID if none provided
const DEFAULT_CHAIN_ID = 8453; // Base

// Create the action provider class
class ZeroExSwapActionProvider extends ActionProvider<WalletProvider> {
	constructor() {
		super("zeroex-swap", []);
	}

	// Get price quote handler
	async getPriceQuote(
		walletProvider: WalletProvider,
		args: z.infer<typeof SwapQuoteSchema>,
	): Promise<string> {
		try {
			// Get the chain details from the wallet provider or use provided chainId
			const network = await walletProvider.getNetwork();
			let chainId = args.chainId;

			if (!chainId && network?.chainId) {
				chainId = Number(network.chainId);
			} else if (!chainId) {
				chainId = DEFAULT_CHAIN_ID;
			}

			// Get the 0x API URL for this chain
			const apiUrl = Object.prototype.hasOwnProperty.call(
				CHAIN_ID_TO_ZERO_EX_API,
				chainId,
			)
				? CHAIN_ID_TO_ZERO_EX_API[chainId as number]
				: ZERO_EX_API_URL;

			// Make request to the 0x price API
			const response = await axios.get(`${apiUrl}/swap/v1/price`, {
				params: {
					sellToken: args.sellToken,
					buyToken: args.buyToken,
					sellAmount: args.sellAmount,
					chainId: chainId,
				},
				headers: {
					"0x-api-key": process.env.ZEROX_API_KEY || "", // Optional API key
				},
			});

			const quote = response.data;

			return JSON.stringify(
				{
					sellToken: quote.sellTokenAddress,
					buyToken: quote.buyTokenAddress,
					sellAmount: quote.sellAmount,
					buyAmount: quote.buyAmount,
					price: quote.price,
					estimatedGas: quote.estimatedGas,
					estimatedPriceImpact: quote.estimatedPriceImpact,
					sources:
						quote.sources
							?.filter((s: any) => s.proportion > "0")
							?.map((s: any) => s.name) || [],
				},
				null,
				2,
			);
		} catch (error: unknown) {
			console.error("Error getting price quote:", error);
			const err = error as {
				response?: { data?: { validationErrors?: unknown } };
				message?: string;
			};
			if (err.response?.data?.validationErrors) {
				return `Failed to get price quote: ${JSON.stringify(err.response.data.validationErrors)}`;
			}
			return `Failed to get price quote: ${err.message || "Unknown error"}`;
		}
	}

	// Execute swap handler
	async executeSwap(
		walletProvider: WalletProvider,
		args: z.infer<typeof ExecuteSwapSchema>,
	): Promise<string> {
		try {
			// Get the wallet details
			const walletAddress = await walletProvider.getAddress();
			const network = await walletProvider.getNetwork();

			let chainId = args.chainId;
			if (!chainId && network?.chainId) {
				chainId = Number(network.chainId);
			} else if (!chainId) {
				chainId = DEFAULT_CHAIN_ID;
			}

			// Get the 0x API URL for this chain
			const apiUrl = Object.prototype.hasOwnProperty.call(
				CHAIN_ID_TO_ZERO_EX_API,
				chainId,
			)
				? CHAIN_ID_TO_ZERO_EX_API[chainId as number]
				: ZERO_EX_API_URL;

			// First fetch price to check for allowance issues
			const priceResponse = await axios.get(`${apiUrl}/swap/permit2/price`, {
				params: {
					sellToken: args.sellToken,
					buyToken: args.buyToken,
					sellAmount: args.sellAmount,
					takerAddress: walletAddress,
					slippagePercentage: args.slippagePercentage / 100, // Convert from percentage to decimal
					chainId: chainId,
				},
				headers: {
					"0x-api-key": process.env.ZEROX_API_KEY || "",
					"0x-version": "v2",
				},
			});

			const priceData = priceResponse.data;

			// Check if we need to approve tokens for Permit2
			if (priceData.issues?.allowance !== null) {
				return JSON.stringify(
					{
						status: "approval_needed",
						tokenAddress: args.sellToken,
						spenderAddress: priceData.issues.allowance.spender,
						message:
							"Token approval is required before swapping. Please use check_token_allowance action.",
					},
					null,
					2,
				);
			}

			// Get the swap quote with transaction data
			const quoteResponse = await axios.get(`${apiUrl}/swap/permit2/quote`, {
				params: {
					sellToken: args.sellToken,
					buyToken: args.buyToken,
					sellAmount: args.sellAmount,
					takerAddress: walletAddress,
					slippagePercentage: args.slippagePercentage / 100,
					chainId: chainId,
				},
				headers: {
					"0x-api-key": process.env.ZEROX_API_KEY || "",
					"0x-version": "v2",
				},
			});

			const quoteData = quoteResponse.data;

			// Handle Permit2 signing if needed
			let signedData = quoteData.transaction.data;

			if (quoteData.permit2?.eip712) {
				try {
					// Note: signMessage may not be available on all wallet providers
					// This is an example implementation
					const signature = await (walletProvider as any).signMessage(
						JSON.stringify(quoteData.permit2.eip712),
					);

					// Combine transaction data with the signature
					// This is a simplified version - in reality more processing might be needed
					signedData = `${quoteData.transaction.data}${signature.slice(2)}`;
				} catch (error) {
					console.error("Error signing permit message:", error);
					return JSON.stringify(
						{
							status: "error",
							message:
								"Failed to sign permit message. This wallet may not support the required signing method.",
						},
						null,
						2,
					);
				}
			}

			// Execute the transaction
			const txParams = {
				to: quoteData.transaction.to,
				data: signedData,
				value: quoteData.transaction.value || "0x0",
			};

			try {
				// Note: sendTransaction may not be available on all wallet providers
				// This is an example implementation
				const txHash = await (walletProvider as any).sendTransaction(txParams);

				// Return transaction hash and swap details
				return JSON.stringify(
					{
						transactionHash: txHash,
						sellToken: {
							symbol: quoteData.sellTokenSymbol,
							amount: quoteData.sellAmount,
						},
						buyToken: {
							symbol: quoteData.buyTokenSymbol,
							amount: quoteData.buyAmount,
						},
						expectedRate: quoteData.price,
						sources:
							quoteData.sources
								?.filter((s: any) => s.proportion > "0")
								?.map((s: any) => s.name) || [],
						status: "Transaction submitted",
					},
					null,
					2,
				);
			} catch (txError) {
				console.error("Error sending transaction:", txError);
				return JSON.stringify(
					{
						status: "error",
						message:
							"Failed to send transaction. This wallet may not support the required transaction method.",
					},
					null,
					2,
				);
			}
		} catch (error: unknown) {
			console.error("Error executing swap:", error);
			const err = error as {
				response?: { data?: { validationErrors?: unknown } };
				message?: string;
			};
			if (err.response?.data?.validationErrors) {
				return `Failed to execute swap: ${JSON.stringify(err.response.data.validationErrors)}`;
			}
			return `Failed to execute swap: ${err.message || "Unknown error"}`;
		}
	}

	// Check token allowance handler
	async checkTokenAllowance(
		walletProvider: WalletProvider,
		args: z.infer<typeof TokenAllowanceSchema>,
	): Promise<string> {
		try {
			// Get wallet details
			const walletAddress = await walletProvider.getAddress();
			const network = await walletProvider.getNetwork();

			let chainId = args.chainId;
			if (!chainId && network?.chainId) {
				chainId = Number(network.chainId);
			} else if (!chainId) {
				chainId = DEFAULT_CHAIN_ID;
			}

			// Get the 0x API URL for this chain
			const apiUrl = Object.prototype.hasOwnProperty.call(
				CHAIN_ID_TO_ZERO_EX_API,
				chainId,
			)
				? CHAIN_ID_TO_ZERO_EX_API[chainId as number]
				: ZERO_EX_API_URL;

			// Get the 0x Exchange Proxy address or use provided spender
			let spenderAddress = args.spenderAddress;
			if (!spenderAddress) {
				// If no spender provided, use price API to get the default Permit2 spender
				const priceResponse = await axios.get(`${apiUrl}/swap/permit2/price`, {
					params: {
						sellToken: args.tokenAddress,
						buyToken: "ETH", // Doesn't matter for this check
						sellAmount: "1000000", // Minimal amount
						takerAddress: walletAddress,
						chainId: chainId,
					},
					headers: {
						"0x-api-key": process.env.ZEROX_API_KEY || "",
						"0x-version": "v2",
					},
				});

				if (priceResponse.data.issues?.allowance) {
					spenderAddress = priceResponse.data.issues.allowance.spender;
				} else {
					return JSON.stringify(
						{
							needsApproval: false,
							message:
								"Could not determine spender address. Token may already be approved.",
						},
						null,
						2,
					);
				}
			}

			try {
				// Note: callContract may not be available on all wallet providers
				// This is an example implementation
				const allowanceResult = await (walletProvider as any).callContract(
					args.tokenAddress,
					"allowance",
					[walletAddress, spenderAddress],
				);

				const allowance = allowanceResult.toString();

				// If allowance is sufficient
				if (BigInt(allowance) >= BigInt(args.amount)) {
					return JSON.stringify(
						{
							needsApproval: false,
							currentAllowance: allowance,
							message: "Token allowance is sufficient for this transaction",
						},
						null,
						2,
					);
				}

				// If allowance is insufficient, return approval transaction data
				const approveData = {
					to: args.tokenAddress,
					data: {
						method: "approve",
						args: [
							spenderAddress,
							"115792089237316195423570985008687907853269984665640564039457584007913129639935",
						], // max uint256
					},
				};

				return JSON.stringify(
					{
						needsApproval: true,
						currentAllowance: allowance,
						requiredAllowance: args.amount,
						approvalData: approveData,
						message:
							"Token approval is required. Execute the returned approval transaction before swapping.",
					},
					null,
					2,
				);
			} catch (contractError) {
				console.error("Error checking allowance:", contractError);
				return JSON.stringify(
					{
						status: "error",
						message:
							"Failed to check token allowance. This wallet may not support the required contract call method.",
					},
					null,
					2,
				);
			}
		} catch (error: unknown) {
			console.error("Error checking token allowance:", error);
			const err = error as { message?: string };
			return `Failed to check token allowance: ${err.message || "Unknown error"}`;
		}
	}

	// Define which networks this action provider supports
	supportsNetwork(network: Network): boolean {
		// Support all networks where 0x Protocol is available
		if (!network.chainId) return false;
		return Object.keys(CHAIN_ID_TO_ZERO_EX_API).includes(
			network.chainId.toString(),
		);
	}

	// Register the available actions
	getActions(walletProvider: WalletProvider) {
		return [
			{
				name: "get_price_quote",
				description: "Get a price quote for swapping tokens using 0x Protocol",
				schema: SwapQuoteSchema,
				invoke: (args: z.infer<typeof SwapQuoteSchema>) =>
					this.getPriceQuote(walletProvider, args),
			},
			{
				name: "execute_swap",
				description: "Execute a token swap using 0x Protocol with Permit2",
				schema: ExecuteSwapSchema,
				invoke: (args: z.infer<typeof ExecuteSwapSchema>) =>
					this.executeSwap(walletProvider, args),
			},
			{
				name: "check_token_allowance",
				description:
					"Check if token approval is needed and get approval transaction data",
				schema: TokenAllowanceSchema,
				invoke: (args: z.infer<typeof TokenAllowanceSchema>) =>
					this.checkTokenAllowance(walletProvider, args),
			},
		];
	}
}

// Export a factory function to create the action provider
export const zeroExSwapActionProvider = () => new ZeroExSwapActionProvider();
