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

export default function Page() {
  return (
    <div className="flex items-center justify-center min-h-svh">
      <section>
        <div>
          <Badge className="mb-6 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-blue-500/30 text-blue-300">
            <Sparkles className="w-4 h-4 mr-2" />
            Powered by Coinbase Agent Kit
          </Badge>
        </div>
      </section>
    </div>
  );
}
