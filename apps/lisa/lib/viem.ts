// Initialize WalletProvider:https://docs.cdp.coinbase.com/agentkit/docs/wallet-management
//https://docs.cdp.coinbase.com/agentkit/docs/wallet-management
import { ViemWalletProvider } from "@coinbase/agentkit";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { Address, createWalletClient, http } from "viem";

const account = privateKeyToAccount(
	process.env.WALLET_PRIVATE_KEYS! as Address,
);
const client = createWalletClient({
	account,
	chain: base,
	transport: http(),
});

const walletProvider = new ViemWalletProvider(client);

export { walletProvider };
