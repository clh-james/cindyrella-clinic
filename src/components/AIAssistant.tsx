"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X } from "lucide-react";
import Link from "next/link";

type Message = {
  id: string;
  sender: "bot" | "user";
  text: string | React.ReactNode;
};

const SUGGESTIONS = [
  "Which IV treatment is right for me?",
  "How much does it cost?",
  "Available schedules",
  "Package recommendations",
  "Book appointments",
];

const RESPONSES: Record<string, React.ReactNode> = {
  "Which IV treatment is right for me?": (
    <>
      It depends on your goals! For energy, try the <strong>Immunity Boost</strong>. For skin, try the <strong>Luxury Glow</strong>. Check out our <Link href="/treatments" className="text-royal underline">Treatments page</Link> for more details.
    </>
  ),
  "How much does it cost?": (
    <>
      Our single sessions typically range from <strong>₱1,500 to ₱3,500</strong> depending on the formulation. We also offer amazing 5+1 and 10+2 packages for significant savings!
    </>
  ),
  "Available schedules": (
    <>
      We are open <strong>Monday to Saturday, from 10:00 AM to 7:00 PM</strong>. We recommend booking in advance to secure your preferred time slot.
    </>
  ),
  "Package recommendations": (
    <>
      If you want to maintain long-term wellness, our <strong>5+1 package</strong> is great. For maximum savings and consistent results, our <strong>10+2 package</strong> is highly recommended!
    </>
  ),
  "Book appointments": (
    <>
      You can easily secure your session on our <Link href="/booking" className="text-royal underline">Booking page</Link>. We can&apos;t wait to see you!
    </>
  ),
};

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "greeting",
      sender: "bot",
      text: "👋 Hi! I'm Cindy, your IV Therapy Assistant. How can I help you today?",
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSuggestionClick = (suggestion: string) => {
    // Add user message
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), sender: "user", text: suggestion },
    ]);
    
    setIsTyping(true);

    // Simulate AI thinking delay
    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "bot",
          text: RESPONSES[suggestion] || "I can help with that! Please contact our clinic directly for more details.",
        },
      ]);
    }, 800);
  };

  return (
    <>
      {/* Floating Action Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-royal text-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:bg-royal-deep transition-colors"
          >
            <MessageCircle size={28} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-50 flex h-[500px] max-h-[75vh] w-[350px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-[0_20px_40px_-15px_rgba(11,26,51,0.25)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between bg-royal px-4 py-3 text-white">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm font-bold">
                  C
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Cindy</h3>
                  <p className="text-[10px] text-white/80">IV Therapy Assistant</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-full p-1.5 hover:bg-white/20 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 bg-pale/30">
              <div className="flex flex-col gap-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.sender === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                        msg.sender === "user"
                          ? "bg-royal text-white rounded-tr-sm"
                          : "bg-paper border border-line text-ink rounded-tl-sm shadow-sm"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-paper border border-line text-ink rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                      <div className="flex gap-1">
                        <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }} className="h-1.5 w-1.5 rounded-full bg-ink-soft/50" />
                        <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }} className="h-1.5 w-1.5 rounded-full bg-ink-soft/50" />
                        <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }} className="h-1.5 w-1.5 rounded-full bg-ink-soft/50" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Suggestions Area */}
            <div className="border-t border-line bg-white p-3">
              <p className="mb-2 text-xs font-medium text-ink-soft px-1">Suggested questions:</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => handleSuggestionClick(suggestion)}
                    disabled={isTyping}
                    className="rounded-full border border-line bg-pale px-4 py-2 text-sm text-ink transition-colors hover:border-royal hover:text-royal disabled:opacity-50 text-left min-h-[40px] flex items-center"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
