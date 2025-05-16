/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	experimental: {
		serverComponentsExternalPackages: [
			"@coinbase/agentkit-langchain",
			"@langchain/langgraph",
		],
	},
};

module.exports = nextConfig;
