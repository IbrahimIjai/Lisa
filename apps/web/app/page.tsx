import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import {
  ArrowRight,
  MessageSquare,
  Zap,
  Shield,
  Globe,
  Sparkles,
} from "lucide-react";
import { ChatDemo } from "@/ui/landing/chat-demo";
import { sampleChats } from "@/ui/static-data";



export default function Page() {
  return (
    <div className="flex flex-col items-center justify-center min-h-svh">
      <section>
        <div>
          <Badge className="mb-6 bg-gradient-to-r from-primary/20 to-primary/20 border-primary/30 text-primary">
            <Sparkles className="w-4 h-4 mr-2" />
            Powered by Coinbase Agent Kit
          </Badge>

          <h1 className="text-5xl md:text-7xl font-bold mb-8 bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
            DeFi Without
            <br />
            <span className="bg-gradient-to-r from-primary to-primary bg-clip-text text-transparent">
              Complexity
            </span>
          </h1>

          <p className="text-sm md:text-base text-gray-300 mb-4 max-w-4xl mx-auto leading-relaxed">
            Execute sophisticated DeFi strategies using plain English. No
            interfaces to learn, no protocols to master—just tell us what you
            want to achieve.
          </p>
          <p className="text-xs text-gray-400 mb-8 max-w-3xl mx-auto">
            "Swap my ETH for USDC" • "Lend on Aave" • "Farm yield on Moonwell" •
            "Convert NGN to crypto"
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button
              size="lg"
              className="bg-gradient-to-r from-primary to-primary hover:from-primary/80 hover:to-primary/80 text-lg px-8 py-4"
            >
              Start Trading
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-800 text-lg px-8 py-4"
            >
              View Demo
            </Button>
          </div>
        </div>
      </section>

      <section>
        <ChatDemo
          chats={sampleChats}
          assistantName="Lisa"
          placeholder="Try: 'Convert my USDC to ETH' or 'Show my portfolio balance'"
        />
      </section>
    </div>
  );
}
