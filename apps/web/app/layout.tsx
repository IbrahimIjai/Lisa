import { Geist, Geist_Mono } from "next/font/google";

import "@workspace/ui/globals.css";
import { headers } from "next/headers";
import { Toaster } from "@workspace/ui/components/sonner";
import { Providers } from "@/providers/root-provider";
import { SiteHeader } from "@/ui/site-header";

const fontSans = Geist({
	subsets: ["latin"],
	variable: "--font-sans",
});

const fontMono = Geist_Mono({
	subsets: ["latin"],
	variable: "--font-mono",
});

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const headersObj = await headers();
	const cookies = headersObj.get("cookie");
	return (
		<html lang="en" suppressHydrationWarning>
			<body
				className={`${fontSans.variable} ${fontMono.variable} overscroll-none font-sans antialiased`}>
				<Providers cookies={cookies}>
					<SiteHeader />
					{children}
					<Toaster />
				</Providers>
			</body>
		</html>
	);
}
