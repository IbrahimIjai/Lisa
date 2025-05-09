"use client";

import * as React from "react";
import { ThemeProvider } from "./theme-provider";
import Web3ContextProvider from "./reown";
// import { WagmiContextProvider } from "./wagmi";

export function Providers({
	children,
	cookies,
	...props
}: {
	children: React.ReactNode;
	cookies: string | null;
}) {
	return (
		<ThemeProvider>
			<Web3ContextProvider cookies={cookies}>{children}</Web3ContextProvider>
		</ThemeProvider>
	);
}
