import { ChatMessage } from "./landing/chat-demo";

export const sampleChats: ChatMessage[] = [
  {
    id: "1",
    sender: "user",
    message: "Hello Lisa, swap 20% of my ETH to USDC and send to my wallet1",
  },
  {
    id: "2",
    sender: "assistant",
    message: "I've just checked your balance - you have 2.4 ETH available.",
  },
  {
    id: "3",
    sender: "assistant",
    message:
      "✅ Successfully swapped 20% of your ETH (0.48 ETH) for 1,247 USDC",
    metadata: {
      type: "success",
      details: "Remaining: 1.92 ETH | Received: 1,247 USDC",
    },
  },
  {
    id: "4",
    sender: "assistant",
    message: "✅ Successfully sent 1,247 USDC to wallet1",
    metadata: {
      type: "success",
      details: "Transaction: 0x7a8b...9c2d",
    },
  },
  {
    id: "5",
    sender: "user",
    message: "Stake 1000 USDC to Moonwell",
  },
  {
    id: "6",
    sender: "assistant",
    message: "✅ Successfully staked 1,000 USDC to Moonwell",
    metadata: {
      type: "success",
      highlight: "Currently earning 5.2% APY",
    },
  },
  {
    id: "7",
    sender: "assistant",
    message:
      "Would you like me to analyze your portfolio and suggest ways to maximize yield across the protocols I can interact with?",
    metadata: {
      type: "info",
      highlight:
        "I can optimize across Aave, Compound, Curve, and 15+ other protocols",
    },
  },
];
