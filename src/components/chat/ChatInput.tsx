"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { useChatStore } from "@/stores/chat-store";

interface ChatInputProps {
  onSend: (message: string) => void;
  isStreaming: boolean;
  onStop: () => void;
}

export function ChatInput({ onSend, isStreaming, onStop }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadedContext, addUploadedContext, removeUploadedContext } = useChatStore();

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || isStreaming) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 160) + "px";
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const uploaded: string[] = [];

    for (const file of Array.from(files)) {
      // Text-based files
      if (file.type.startsWith("text/") || file.name.match(/\.(md|json|csv|xml|yaml|yml|txt|js|ts|tsx|jsx|py|html|css|log|sh|env|toml|ini|cfg|conf|sql|r|rb|go|rs|java|c|cpp|h|hpp|swift|kt|scala|pl|php)$/i)) {
        const text = await file.text();
        addUploadedContext({ name: file.name, content: text.slice(0, 50000) });
        uploaded.push(file.name);
      }
      // PDFs — extract readable text spans from the raw binary
      else if (file.type === "application/pdf") {
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        const raw = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
        // Pull text from PDF stream objects (parenthesized strings and BT/ET blocks)
        const textParts: string[] = [];
        // Match parenthesized strings: (some text)
        for (const m of raw.matchAll(/\(([^)]{2,})\)/g)) {
          const t = m[1].replace(/\\n/g, "\n").replace(/\\r/g, "").replace(/\\([()\\])/g, "$1");
          if (/[a-zA-Z]{2,}/.test(t)) textParts.push(t);
        }
        const extracted = textParts.join(" ").replace(/\s+/g, " ").trim().slice(0, 50000);
        addUploadedContext({
          name: file.name,
          content: extracted
            ? `[PDF: ${file.name}]\n${extracted}`
            : `[PDF: ${file.name} — could not extract text. The file may be image-based or encrypted.]`,
        });
        uploaded.push(file.name);
      }
      // Images — note metadata (no vision model available)
      else if (file.type.startsWith("image/")) {
        addUploadedContext({
          name: file.name,
          content: `[Image file: ${file.name}, type: ${file.type}, size: ${(file.size / 1024).toFixed(1)}KB] — Image uploaded. Vision is not available, but you can ask about it by name.`,
        });
        uploaded.push(file.name);
      }
      // Any other file — try reading as text
      else {
        const text = await file.text().catch(() => "");
        if (text && /[a-zA-Z]/.test(text)) {
          addUploadedContext({ name: file.name, content: text.slice(0, 50000) });
          uploaded.push(file.name);
        } else {
          addUploadedContext({
            name: file.name,
            content: `[Binary file: ${file.name}, type: ${file.type || "unknown"}, size: ${(file.size / 1024).toFixed(1)}KB] — This file format cannot be read as text.`,
          });
          uploaded.push(file.name);
        }
      }
    }

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";

    // Auto-send a message so the AI immediately acknowledges the upload
    if (uploaded.length > 0) {
      const names = uploaded.join(", ");
      onSend(uploaded.length === 1
        ? `I've uploaded a file: ${names}. Please review it and summarize the key points.`
        : `I've uploaded ${uploaded.length} files: ${names}. Please review them and summarize the key points.`);
    }
  };

  return (
    <div style={{ padding: "12px 16px 8px", borderTop: "1px solid var(--border)", background: "var(--surface-primary)" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {/* Uploaded context chips */}
        {uploadedContext.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
            {uploadedContext.map((f) => (
              <div
                key={f.name}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 10px",
                  borderRadius: 999,
                  background: "var(--accent-light)",
                  color: "var(--accent)",
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                <button
                  onClick={() => removeUploadedContext(f.name)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--accent)",
                    cursor: "pointer",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="nova-input-bar">
          {/* Attach button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              flexShrink: 0,
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 8,
              border: "none",
              background: "transparent",
              color: "var(--text-secondary)",
              cursor: "pointer",
              transition: "color 0.15s",
            }}
            aria-label="Attach file"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".txt,.md,.json,.csv,.xml,.yaml,.yml,.js,.ts,.tsx,.jsx,.py,.html,.css,.log,.pdf,.docx,.doc,.rtf,.sh,.sql,.env,.toml,.ini,.cfg,.conf,.r,.rb,.go,.rs,.java,.c,.cpp,.h,.hpp,.swift,.kt,.scala,.pl,.php,image/*"
            style={{ display: "none" }}
            onChange={handleFileUpload}
          />

          <textarea
            ref={textareaRef}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              resize: "none",
              color: "var(--text-primary)",
              fontSize: 16,
              lineHeight: "24px",
              maxHeight: 160,
              fontFamily: "inherit",
            }}
            placeholder="Message Nova..."
            rows={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
          />

          {isStreaming ? (
            <button
              onClick={onStop}
              style={{
                flexShrink: 0,
                width: 36,
                height: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%",
                border: "none",
                background: "#ef4444",
                color: "#fff",
                cursor: "pointer",
                transition: "background 0.15s",
              }}
              aria-label="Stop generating"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                <rect x="2" y="2" width="10" height="10" rx="2" />
              </svg>
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!value.trim()}
              className={`nova-send-btn ${value.trim() ? "active" : "inactive"}`}
              aria-label="Send message"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          )}
        </div>
        <div style={{ textAlign: "center", marginTop: 6, fontSize: 11, color: "var(--text-secondary)" }}>
          Nova can make mistakes. Verify important information.
        </div>
      </div>
    </div>
  );
}
