"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface TVMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function TVMode() {
  const [messages, setMessages] = useState<TVMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showInput, setShowInput] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-hide input after 5s of inactivity
  const resetHideTimer = useCallback(() => {
    setShowInput(true);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = setTimeout(() => {
      if (!isStreaming) setShowInput(false);
    }, 5000);
  }, [isStreaming]);

  useEffect(() => {
    const handleActivity = () => resetHideTimer();
    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keydown", handleActivity);
    resetHideTimer();
    return () => {
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [resetHideTimer]);

  // Voice input
  const toggleVoice = useCallback(() => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
      // Auto-send after voice input
      sendMessageDirect(transcript);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      recognition.start();
      setIsListening(true);
    }
  }, [isListening]);

  const sendMessageDirect = async (text: string) => {
    if (!text.trim() || isStreaming) return;

    const userMsg: TVMessage = { id: Date.now().toString(), role: "user", content: text.trim() };
    const assistantId = (Date.now() + 1).toString();
    const assistantMsg: TVMessage = { id: assistantId, role: "assistant", content: "" };

    setMessages((prev) => [...prev.slice(-4), userMsg, assistantMsg]); // Keep last few for TV
    setInput("");
    setIsStreaming(true);

    try {
      const allMessages = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: allMessages }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") break;
              try {
                const parsed = JSON.parse(data);
                if (parsed.token) {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? { ...m, content: m.content + parsed.token }
                        : m
                    )
                  );
                }
              } catch {}
            }
          }
        }
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: "Something went wrong. Please try again." }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  const handleSend = () => sendMessageDirect(input);

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");

  return (
    <div className="h-dvh w-full bg-black text-white flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Content Area */}
      <div
        ref={contentRef}
        className="flex-1 flex items-center justify-center w-full max-w-4xl"
      >
        {lastAssistant ? (
          <div className="animate-fade-in-up text-center">
            <p className="text-2xl sm:text-3xl md:text-4xl font-light leading-relaxed whitespace-pre-wrap">
              {lastAssistant.content}
              {isStreaming && (
                <span className="inline-block w-[3px] h-[1em] bg-[#3aadbf] ml-1 align-text-bottom animate-blink" />
              )}
            </p>
          </div>
        ) : (
          <div className="text-center animate-fade-in-up">
            <div className="w-20 h-20 rounded-full bg-[#3aadbf] flex items-center justify-center mx-auto mb-8">
              <span className="text-4xl font-bold text-white">N</span>
            </div>
            <h1 className="text-4xl font-light mb-4">Nova TV Mode</h1>
            <p className="text-xl text-gray-400">Say &ldquo;Hey Nova&rdquo; or type to begin</p>
          </div>
        )}
      </div>

      {/* Input Bar */}
      <div
        className={`w-full max-w-2xl transition-all duration-500 ${
          showInput ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-xl rounded-full px-5 py-3 border border-white/20">
          {/* Voice button */}
          <button
            onClick={toggleVoice}
            className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors cursor-pointer ${
              isListening ? "bg-red-500 animate-pulse-slow" : "bg-white/20 hover:bg-white/30"
            }`}
            aria-label="Voice input"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </button>

          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-white text-lg placeholder:text-gray-400"
            placeholder={isListening ? "Listening..." : "Ask Nova something..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />

          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-[#3aadbf] hover:bg-[#4dc2d4] disabled:opacity-40 transition-colors cursor-pointer"
            aria-label="Send"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Back link */}
      <a
        href="/"
        className="absolute top-6 left-6 text-gray-500 hover:text-white transition-colors text-sm flex items-center gap-2"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Exit TV Mode
      </a>
    </div>
  );
}
