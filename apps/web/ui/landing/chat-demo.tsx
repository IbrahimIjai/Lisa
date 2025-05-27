"use client";

import { MessageSquare } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { useRef, useState, useEffect } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
  useMotionValueEvent,
  AnimatePresence,
} from "motion/react";

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
  const containerRef = useRef<HTMLDivElement>(null);
  const chatComponentRef = useRef<HTMLDivElement>(null);
  const chatMessagesRef = useRef<HTMLDivElement>(null);

  const [isPinned, setIsPinned] = useState(false);
  const [maxChatScroll, setMaxChatScroll] = useState(0);

  // Motion values
  const containerScrollProgress = useMotionValue(0);
  const chatScrollPosition = useSpring(0, { stiffness: 300, damping: 30 });

  // Calculate container height based on chat length
  const containerHeight = Math.max(chats.length * 100 + 800, 1500); // Minimum 1500px, or based on chat length

  // Pin trigger position (when chat component should stick)
  const PIN_TRIGGER = 160;

  // Track scroll progress through the container
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  // Transform scroll progress to chat scroll position
  const chatProgress = useTransform(scrollYProgress, [0.2, 0.8], [0, 1]);

  // Update chat scroll limits when component mounts or chats change
  useEffect(() => {
    if (chatMessagesRef.current) {
      const maxScroll =
        chatMessagesRef.current.scrollHeight -
        chatMessagesRef.current.clientHeight;
      setMaxChatScroll(Math.max(0, maxScroll));
    }
  }, [chats]);

  // Handle scroll progress changes
  useMotionValueEvent(chatProgress, "change", (latest) => {
    if (isPinned && chatMessagesRef.current && maxChatScroll > 0) {
      const targetScroll = latest * maxChatScroll;
      chatMessagesRef.current.scrollTop = targetScroll;
      chatScrollPosition.set(latest);
    }
  });

  // Handle pinning/unpinning based on scroll position
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    if (!containerRef.current || !chatComponentRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const componentRect = chatComponentRef.current.getBoundingClientRect();

    // Calculate how much of the container is left to scroll through
    const containerBottom = containerRect.bottom - window.innerHeight;
    
    // Pin when container is in view and component reaches trigger point
    // Only unpin when we've scrolled past 95% of the container
    const shouldPin =
      containerRect.top <= PIN_TRIGGER &&
      (containerBottom > 0 || containerRect.bottom > PIN_TRIGGER + componentRect.height);

    if (shouldPin && !isPinned) {
      setIsPinned(true);
    } else if (!shouldPin && isPinned) {
      setIsPinned(false);
    }

    // Update container scroll progress for visual feedback
    if (containerRect.height > 0) {
      const progress = Math.max(
        0,
        Math.min(
          1,
          (window.innerHeight - containerRect.top) /
            (containerRect.height + window.innerHeight)
        )
      );
      containerScrollProgress.set(progress);
    }
  });

  // Visual transforms based on scroll state
  const borderGlow = useTransform(
    containerScrollProgress,
    [0, 0.2, 0.8, 1],
    [
      "rgba(75, 85, 99, 1)",
      "rgba(59, 130, 246, 0.6)",
      "rgba(59, 130, 246, 0.6)",
      "rgba(75, 85, 99, 1)",
    ]
  );

  const componentScale = useTransform(
    containerScrollProgress,
    [0, 0.1, 0.9, 1],
    [0.9, 1, 1, 0.9]
  );

  const componentOpacity = useTransform(
    containerScrollProgress,
    [0, 0.1, 0.9, 1],
    [0.5, 1, 1, 0.5]
  );

  const chatScrollPositionWidth = useTransform(
    chatScrollPosition,
    [0, 1],
    ["0%", "100%"]
  );

  return (
    <div className={`w-full lg:w-4/5 mx-auto px-4 ${className}`}>
      {/* Large container that creates the scroll track */}
      <motion.div
        ref={containerRef}
        className="relative"
        style={{ height: containerHeight }}
      >
        {/* Chat component that gets pinned */}
        <motion.div
          ref={chatComponentRef}
          className={`w-full transition-all duration-300 ${
            isPinned
              ? "fixed top-20 left-1/2 -translate-x-1/2 z-30 w-full lg:w-4/5 px-4"
              : "absolute top-0"
          }`}
          style={{
            scale: isPinned ? 1 : componentScale,
            opacity: isPinned ? 1 : componentOpacity,
          }}
          layout
        >
          <motion.div
            className="bg-gray-900/50 backdrop-blur-sm border rounded-2xl p-6"
            style={{
              borderColor: borderGlow,
              boxShadow: isPinned
                ? "0 25px 50px -12px rgba(59, 130, 246, 0.25)"
                : "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
            }}
          >
            {/* Chat Header */}
            <motion.div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-700">
              <motion.div
                className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                {assistantAvatar ? (
                  <img
                    src={assistantAvatar || "/placeholder.svg"}
                    alt={assistantName}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <MessageSquare className="w-5 h-5 text-white" />
                )}
              </motion.div>

              <div className="flex-grow min-w-0">
                <h3 className="font-semibold text-white truncate">
                  {assistantName} - Your DeFi Assistant
                </h3>
                <motion.p
                  className="text-sm text-green-400 flex items-center gap-1"
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                >
                  <span className="w-2 h-2 bg-green-400 rounded-full" />
                  Online
                </motion.p>
              </div>

              {/* Status Indicators */}
              <AnimatePresence>
                {/* {isPinned && ( */}
                  <motion.div
                    className="flex items-center gap-3 flex-shrink-0"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* Progress Indicator */}
                    <div className="text-xs text-center">
                      <div className="text-gray-400 mb-1 whitespace-nowrap">
                        Chat Progress
                      </div>
                      <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                          style={{
                            width: chatScrollPositionWidth,
                          }}
                        />
                      </div>
                      <motion.div className="text-gray-500 text-xs mt-1">
                        {Math.round(chatScrollPosition.get() * 100)}%
                      </motion.div>
                    </div>

                    {/* Pinned Badge */}
                    <motion.div
                      className="flex items-center gap-2 text-xs bg-blue-600/20 border border-blue-500/30 rounded-full px-3 py-1 whitespace-nowrap"
                      animate={{
                        scale: [1, 1.05, 1],
                        boxShadow: [
                          "0 0 0 rgba(59, 130, 246, 0)",
                          "0 0 10px rgba(59, 130, 246, 0.3)",
                          "0 0 0 rgba(59, 130, 246, 0)",
                        ],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Number.POSITIVE_INFINITY,
                      }}
                    >
                      <motion.div
                        className="w-2 h-2 bg-blue-500 rounded-full"
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{
                          duration: 1,
                          repeat: Number.POSITIVE_INFINITY,
                        }}
                      />
                      <span className="text-blue-300">Reading Mode</span>
                    </motion.div>
                  </motion.div>
                {/* // )} */}
              </AnimatePresence>
            </motion.div>

            {/* Chat Messages */}
            <motion.div
              ref={chatMessagesRef}
              className="space-y-4 mb-6 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800"
              style={{
                scrollBehavior: "auto",
                pointerEvents: isPinned ? "none" : "auto", // Disable manual scrolling when pinned
              }}
            >
              {chats.map((chat, index) => (
                <motion.div
                  key={chat.id}
                  className={`flex ${chat.sender === "user" ? "justify-end" : "justify-start"}`}
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{
                    delay: index * 0.05,
                    duration: 0.4,
                    type: "spring",
                    stiffness: 300,
                    damping: 25,
                  }}
                  viewport={{ once: true, margin: "-50px" }}
                >
                  <motion.div
                    className={`rounded-2xl px-4 py-3 max-w-sm transition-all duration-200 ${
                      chat.sender === "user"
                        ? "bg-blue-600 text-white rounded-br-md"
                        : "bg-gray-800 text-gray-100 rounded-bl-md"
                    }`}
                    whileHover={
                      !isPinned
                        ? {
                            scale: 1.02,
                            y: -2,
                            boxShadow:
                              chat.sender === "user"
                                ? "0 10px 25px rgba(37, 99, 235, 0.3)"
                                : "0 10px 25px rgba(0, 0, 0, 0.3)",
                          }
                        : {}
                    }
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  >
                    <p className="text-sm whitespace-pre-line leading-relaxed">
                      {chat.message}
                    </p>

                    {/* Metadata */}
                    {chat.metadata && (
                      <motion.div
                        className="mt-2"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        transition={{ delay: 0.2, duration: 0.3 }}
                      >
                        {chat.metadata.details && (
                          <span className="text-gray-400 text-xs block">
                            {chat.metadata.details}
                          </span>
                        )}
                        {chat.metadata.highlight && (
                          <span
                            className={`text-xs block mt-1 font-medium ${
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
                      </motion.div>
                    )}
                  </motion.div>
                </motion.div>
              ))}

              {/* Typing Indicator */}
              <motion.div
                className="flex justify-start"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: chats.length * 0.05 + 0.3 }}
              >
                <motion.div
                  className="bg-gray-800 text-gray-400 rounded-2xl rounded-bl-md px-4 py-3"
                  animate={{
                    boxShadow: [
                      "0 0 0 rgba(0, 0, 0, 0)",
                      "0 5px 15px rgba(0, 0, 0, 0.2)",
                      "0 0 0 rgba(0, 0, 0, 0)",
                    ],
                  }}
                  transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                >
                  <div className="flex items-center space-x-1">
                    <div className="flex space-x-1">
                      {[0, 0.1, 0.2].map((delay, i) => (
                        <motion.div
                          key={i}
                          className="w-2 h-2 bg-gray-500 rounded-full"
                          animate={{ y: [0, -4, 0] }}
                          transition={{
                            duration: 0.6,
                            repeat: Number.POSITIVE_INFINITY,
                            delay,
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-xs ml-2">
                      {assistantName} is analyzing...
                    </span>
                  </div>
                </motion.div>
              </motion.div>
            </motion.div>

            {/* Input Area */}
            <motion.div
              className="flex gap-3 pt-4 border-t border-gray-700"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <motion.input
                type="text"
                placeholder={placeholder}
                className="flex-1 bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-gray-300 placeholder-gray-500 cursor-not-allowed transition-all duration-300"
                disabled
                whileFocus={{ borderColor: "rgb(59, 130, 246)" }}
              />
              <Button
                disabled
                className="bg-gray-700 text-gray-400 cursor-not-allowed hover:bg-gray-700 px-6 flex-shrink-0"
              >
                Send
              </Button>
            </motion.div>

            {/* Status Message */}
            <motion.p
              className="text-xs text-center mt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              <AnimatePresence mode="wait">
                {isPinned ? (
                  <motion.span
                    key="pinned"
                    className="text-blue-400 flex items-center justify-center gap-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    📖 Reading mode - Scroll to navigate through conversation
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 2,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "linear",
                      }}
                    >
                      ⚡
                    </motion.span>
                  </motion.span>
                ) : (
                  <motion.span
                    key="normal"
                    className="text-gray-500"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    Demo interface - Scroll down to enter reading mode with{" "}
                    {assistantName}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.p>
          </motion.div>
        </motion.div>

        {/* Visual indicator of scroll track (optional, for debugging) */}
        {process.env.NODE_ENV === "development" && (
          <div className="absolute right-4 top-0 bottom-0 w-2 bg-gray-800 rounded-full opacity-20">
            <motion.div
              className="w-full bg-blue-500 rounded-full"
              style={{
                height: useTransform(scrollYProgress, [0, 1], ["0%", "100%"]),
              }}
            />
          </div>
        )}
      </motion.div>
    </div>
  );
}
