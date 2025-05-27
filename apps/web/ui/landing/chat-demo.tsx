import { MessageSquare } from "lucide-react";
import { Button } from "@workspace/ui/components/button";

export interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  message: string;
  metadata?: {
    type?: "success" | "info" | "warning";
    details?: string;
    highlight?: string;
  };
}

interface ChatDemoProps {
  chats: ChatMessage[];
  assistantName?: string;
  assistantAvatar?: string;
  placeholder?: string;
  className?: string;
}

export function ChatDemo({
  chats,
  assistantName = "Lisa",
  assistantAvatar,
  placeholder = "Try: 'Convert my USDC to ETH' or 'Show my portfolio balance'",
  className = "",
}: ChatDemoProps) {
  return (
    <div className={`max-w-4xl mx-auto ${className}`}>
      <div className="bg-gray-900/50 border border-gray-700 rounded-2xl p-6 backdrop-blur-sm">
        {/* Chat Header */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-700">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
            {assistantAvatar ? (
              <img
                src={assistantAvatar || "/placeholder.svg"}
                alt={assistantName}
                className="w-full h-full rounded-full"
              />
            ) : (
              <MessageSquare className="w-5 h-5 text-white" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-white">
              {assistantName} - Your DeFi Assistant
            </h3>
            <p className="text-sm text-green-400">● Online</p>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
          {chats.map((chat) => (
            <div
              key={chat.id}
              className={`flex ${chat.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`rounded-2xl px-4 py-3 max-w-sm ${
                  chat.sender === "user"
                    ? "bg-blue-600 text-white rounded-br-md"
                    : "bg-gray-800 text-gray-100 rounded-bl-md"
                }`}
              >
                <p className="text-sm whitespace-pre-line">{chat.message}</p>

                {/* Metadata */}
                {chat.metadata && (
                  <div className="mt-2">
                    {chat.metadata.details && (
                      <span className="text-gray-400 text-xs block">
                        {chat.metadata.details}
                      </span>
                    )}
                    {chat.metadata.highlight && (
                      <span
                        className={`text-xs block mt-1 ${
                          chat.metadata.type === "success"
                            ? "text-green-400"
                            : chat.metadata.type === "warning"
                              ? "text-yellow-400"
                              : chat.metadata.type === "info"
                                ? "text-blue-400"
                                : "text-purple-400"
                        }`}
                      >
                        {chat.metadata.highlight}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          <div className="flex justify-start">
            <div className="bg-gray-800 text-gray-400 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center space-x-1">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
                <span className="text-xs ml-2">
                  {assistantName} is typing...
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Input Area (Disabled for Demo) */}
        <div className="flex gap-3 pt-4 border-t border-gray-700">
          <input
            type="text"
            placeholder={placeholder}
            className="flex-1 bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-gray-300 placeholder-gray-500 cursor-not-allowed"
            disabled
          />
          <Button
            disabled
            className="bg-gray-700 text-gray-400 cursor-not-allowed hover:bg-gray-700 px-6"
          >
            Send
          </Button>
        </div>

        <p className="text-xs text-gray-500 mt-2 text-center">
          Demo interface - Connect your wallet to start trading with{" "}
          {assistantName}
        </p>
      </div>
    </div>
  );
}
