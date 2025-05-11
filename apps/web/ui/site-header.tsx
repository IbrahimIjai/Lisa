"use client";

import Link from "next/link";
import { Icons } from "./icon";
import { usePathname } from "next/navigation";
import { cn } from "@workspace/ui/lib/utils";
import { WagmiHeaderButton } from "./wagmi-connect-button";

export function SiteHeader() {
	const pathname = usePathname();
	return (
		<header className="border-grid sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
			<div className="container-wrapper h-14 px-4 xl:px-6 mx-auto flex items-center justify-between">
				<Link href="/" className="mr-4 flex items-center gap-2 lg:mr-6">
					<Icons.logo className="h-6 w-6" />
					<span className="hidden font-bold lg:inline-block">
						Zero protocol
					</span>
				</Link>

				<nav className="flex items-center gap-4 text-sm xl:gap-6">
					<Link
						href="/zero-pay"
						className={cn(
							"transition-colors hover:text-foreground/80",
							pathname === "/zero-pay"
								? "text-foreground"
								: "text-foreground/80",
						)}>
						ZeroPay
					</Link>
					<Link
						href="/zero-yield"
						className={cn(
							"transition-colors hover:text-foreground/80",
							pathname?.startsWith("/zero-yield")
								? "text-foreground"
								: "text-foreground/80",
						)}>
						ZeroYield
					</Link>
					<Link
						href="/docs"
						className={cn(
							"transition-colors hover:text-foreground/80",
							pathname?.startsWith("/docs")
								? "text-foreground"
								: "text-foreground/80",
						)}>
						Docs
					</Link>
				</nav>

				<WagmiHeaderButton/>
			</div>
		</header>
	);
}
