"use client";

import { useEffect, useRef, useState } from "react";
import { useChatStore } from "@/stores/chat-store";
import { useChat } from "@/hooks/useChat";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { ChatInput } from "@/components/chat/ChatInput";
import { WaitingGame } from "@/components/chat/WaitingGame";
import { WeatherCard } from "@/components/dashboard/WeatherCard";
import { StockTicker } from "@/components/dashboard/StockTicker";

// Curated Unsplash photos - nature, space, cityscapes, abstract
const UNSPLASH_PHOTOS = [
  "photo-1506905925346-21bda4d32df4", // Mountains
  "photo-1470071459604-3b5ec3a7fe05", // Forest valley
  "photo-1451187580459-43490279c0fa", // Earth from space
  "photo-1519681393784-d120267933ba", // Starry mountains
  "photo-1507400492013-162706c8c05e", // Northern lights
  "photo-1470252649378-9c29740c9fa8", // Sunset ocean
  "photo-1462331940025-496dfbfc7564", // Galaxy
  "photo-1518837695005-2083093ee35b", // Waves
  "photo-1464822759023-fed622ff2c3b", // Mountain peak
  "photo-1534796636912-3b95b3ab5986", // Starry night sky
];

export function ChatView() {
  const { activeConversationId, conversations } = useChatStore();
  const { sendMessage, stopStreaming, isStreaming } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showGame, setShowGame] = useState(false);
  const [gameDismissed, setGameDismissed] = useState(false);

  const conversation = conversations.find((c) => c.id === activeConversationId);
  const messages = conversation?.messages ?? [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, messages[messages.length - 1]?.content]);

  // Show game prompt after 3s of streaming, unless user dismissed it
  useEffect(() => {
    if (isStreaming && !gameDismissed) {
      const t = setTimeout(() => setShowGame(true), 15000);
      return () => clearTimeout(t);
    }
    if (!isStreaming) {
      setShowGame(false);
      setGameDismissed(false);
    }
  }, [isStreaming, gameDismissed]);

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <EmptyState onSend={sendMessage} />
        ) : (
          <div style={{ maxWidth: 768, margin: "0 auto", padding: "24px 16px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* Waiting game */}
      {showGame && isStreaming && (
        <WaitingGame onClose={() => { setShowGame(false); setGameDismissed(true); }} />
      )}

      {/* Input */}
      <ChatInput onSend={sendMessage} isStreaming={isStreaming} onStop={stopStreaming} />
    </div>
  );
}

function EmptyState({ onSend }: { onSend: (msg: string) => void }) {
  // Pick one photo per day based on the date
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
  );
  const photoIndex = dayOfYear % UNSPLASH_PHOTOS.length;

  const quickActions = [
    { icon: "🔍", label: "Search the web", prompt: "Search the web for " },
    { icon: "🎬", label: "Find a video", prompt: "Find me a YouTube video about " },
    { icon: "📎", label: "Upload a file", prompt: "" },
    { icon: "💡", label: "Ask anything", prompt: "" },
  ];

  const photoUrl = `https://images.unsplash.com/${UNSPLASH_PHOTOS[photoIndex]}?w=1920&q=80&auto=format`;

  return (
    <div style={{ position: "relative", height: "100%", overflow: "hidden" }}>
      {/* Background image */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url(${photoUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          transition: "opacity 0.8s ease-in-out",
          opacity: 1,
        }}
      />
      {/* Heavy dark gradient overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.7) 50%, rgba(0,0,0,0.92) 100%)",
        }}
      />

      {/* Content */}
      <div style={{
        position: "relative",
        zIndex: 1,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "auto",
      }}>
        {/* Spacer to push content to center-ish */}
        <div style={{ flex: "1 0 40px", minHeight: 40, maxHeight: 100 }} />

        {/* Hero section */}
        <div className="animate-fade-in-up" style={{
          textAlign: "center",
          padding: "0 16px 20px",
          flexShrink: 0,
        }}>
          <h1 style={{ fontSize: 32, fontWeight: 600, color: "#fff", marginBottom: 6, textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>
            Good {getGreeting()}.
          </h1>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 15, marginBottom: 20 }}>
            What can I help you with?
          </p>

          {/* Designed by pill */}
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 14px",
            borderRadius: 999,
            background: "rgba(255,255,255,0.1)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.15)",
            marginBottom: 20,
          }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>designed by</span>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.85)", fontWeight: 600, letterSpacing: "0.02em" }}>Pixel &amp; Purpose</span>
          </div>

          {/* Quick action chips */}
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
            {quickActions.map((action) => (
              <button
                key={action.label}
                className="nova-chip-glass"
                onClick={() => {
                  if (action.label === "Upload a file") {
                    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
                    fileInput?.click();
                    return;
                  }
                  if (action.prompt) {
                    const el = document.querySelector("textarea");
                    if (el) {
                      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                        window.HTMLTextAreaElement.prototype, "value"
                      )?.set;
                      nativeInputValueSetter?.call(el, action.prompt);
                      el.dispatchEvent(new Event("input", { bubbles: true }));
                      el.dispatchEvent(new Event("change", { bubbles: true }));
                      el.focus();
                    }
                  } else {
                    document.querySelector("textarea")?.focus();
                  }
                }}
              >
                <span>{action.icon}</span>
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Dashboard cards */}
        <div className="nova-dashboard">
          <div className="nova-dashboard-left">
            <WeatherCard />
          </div>
          <div className="nova-dashboard-right">
            <StockTicker />
          </div>
        </div>

        {/* Bottom spacer */}
        <div style={{ flex: "1 0 20px" }} />
      </div>
    </div>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
