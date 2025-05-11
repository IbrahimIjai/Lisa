"use client";

import { shortenAddress } from "@zeroprotocol/helpers/shorten-address";
import { useAppKit } from "@reown/appkit/react";
import { Button } from "@workspace/ui/components/button";
import { Address } from "viem";
import { useAccount } from "wagmi";

export const WagmiHeaderButton: React.FC = () => {
	const { open, close } = useAppKit();
	const { isConnected, isConnecting, address } = useAccount();

	return (
		<div className="flex items-center gap-2">
			{isConnected ? (
				<>
					
					<Button
						className=""
						variant="secondary"
						onClick={() => open({ view: "Account" })}>
						{shortenAddress(address as Address, 2)}
					</Button>
				</>
			) : (
				<Button variant="secondary" onClick={() => open({ view: "Connect" })}>
					Connect
				</Button>
			)}
		</div>
	);
};
