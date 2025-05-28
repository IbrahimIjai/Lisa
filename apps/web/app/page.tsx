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
    <div className="flex flex-col items-center justify-center min-h-svh w-full">
      <section className="border-grid border-b w-full">
        <div className="container-wrapper">
          <div className="container flex flex-col items-start px-4 xl:px-6 gap-1 py-8 md:py-10 lg:py-12">
            <Badge className="mb-4 bg-gradient-to-r from-primary/20 to-primary/20 border-primary/30 text-primary">
              <Sparkles className="w-4 h-4 mr-2" />
              Powered by Coinbase Agent Kit
            </Badge>

            <h1 className="text-2xl font-bold leading-tight tracking-tighter sm:text-3xl md:text-4xl lg:leading-[1.1]">
              DeFi Without
              <br />
              <span className="bg-gradient-to-r from-primary to-primary bg-clip-text text-transparent">
                Complexity
              </span>
            </h1>

            <p className="text-sm md:text-base mb-4 max-w-4xl leading-relaxed">
              Execute sophisticated DeFi strategies using plain English. No
              interfaces to learn, no protocols to master—just tell us what you
              want to achieve.
              <span>
                "Swap my ETH for USDC" • "Lend on Aave" • "Farm yield on
                Moonwell" • "Convert NGN to crypto"
              </span>
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button
                size="sm"
                className="bg-gradient-to-r from-primary to-primary hover:from-primary/80 hover:to-primary/80"
              >
                Start Chatting
              </Button>
              <Button size="sm" variant="outline" className="">
                View Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="container-wrapper pt-24">
        <ChatDemo
          chats={sampleChats}
          assistantName="Lisa"
          placeholder="Try: 'Convert my USDC to ETH' or 'Show my portfolio balance'"
        />
      </section>

      <section className="mt-24 container-wrapper h-[300vh]">
        <div className="h-full w-full bg-gray-900/50 backdrop-blur-sm border rounded-2xl p-6"></div>
      </section>
    </div>
  );
}
