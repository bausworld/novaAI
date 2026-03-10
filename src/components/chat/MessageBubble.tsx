"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Message, EmailDraft, GeneratedDoc, JiraResult, JiraIssue } from "@/lib/types";
import { SourceCitation } from "./SourceCitation";
import { VideoCard } from "./VideoCard";
import { useChatStore } from "@/stores/chat-store";

interface MessageBubbleProps {
  message: Message;
}

function getAmericanVoice(): SpeechSynthesisVoice | null {
  return null; // unused, kept for fallback
}

function SpeakButton({ text }: { text: string }) {
  const [speaking, setSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      URL.revokeObjectURL(audioRef.current.src);
      audioRef.current = null;
    }
    setSpeaking(false);
    setLoading(false);
  }, []);

  const toggle = useCallback(async () => {
    if (speaking || loading) {
      stop();
      return;
    }
    // Strip markdown for cleaner speech
    const clean = text
      .replace(/[#*_~`>\[\]()!|]/g, "")
      .replace(/\n{2,}/g, ". ")
      .replace(/\n/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();
    if (!clean) return;

    setLoading(true);
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: clean }),
      });
      if (!res.ok) throw new Error("TTS failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { stop(); };
      audio.onerror = () => { stop(); };
      await audio.play();
      setLoading(false);
      setSpeaking(true);
    } catch {
      stop();
    }
  }, [text, speaking, loading, stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { stop(); };
  }, [stop]);

  return (
    <button
      onClick={toggle}
      title={speaking ? "Stop" : loading ? "Loading..." : "Read aloud"}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 2,
        color: (speaking || loading) ? "var(--accent)" : "var(--text-secondary)",
        opacity: (speaking || loading) ? 1 : 0.6,
        transition: "color 0.15s, opacity 0.15s",
        display: "inline-flex",
        alignItems: "center",
      }}
    >
      {loading ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-pulse-slow">
          <circle cx="12" cy="12" r="10" />
        </svg>
      ) : speaking ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="6" y="4" width="4" height="16" />
          <rect x="14" y="4" width="4" height="16" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </svg>
      )}
    </button>
  );
}

// File extension map for common languages
const LANG_EXT: Record<string, string> = {
  javascript: "js", typescript: "ts", python: "py", ruby: "rb", rust: "rs",
  go: "go", java: "java", cpp: "cpp", c: "c", csharp: "cs", swift: "swift",
  kotlin: "kt", php: "php", html: "html", css: "css", scss: "scss",
  json: "json", yaml: "yaml", yml: "yml", xml: "xml", sql: "sql",
  bash: "sh", shell: "sh", zsh: "sh", sh: "sh", markdown: "md",
  tsx: "tsx", jsx: "jsx", vue: "vue", svelte: "svelte", toml: "toml",
  ini: "ini", dockerfile: "Dockerfile", makefile: "Makefile",
};

function CodeBlock({ lang, children }: { lang?: string; children: string }) {
  const [copied, setCopied] = useState(false);
  const code = children.replace(/\n$/, "");
  const language = lang?.toLowerCase() || "";
  const ext = LANG_EXT[language] || language || "txt";
  const filename = `nova-code.${ext}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{
      borderRadius: 10,
      overflow: "hidden",
      border: "1px solid var(--border)",
      marginBlock: 10,
      background: "var(--surface-tertiary)",
    }}>
      {/* Toolbar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "6px 12px",
        background: "var(--surface-secondary)",
        borderBottom: "1px solid var(--border)",
        fontSize: 12,
      }}>
        <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
          {language || "code"}
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          {/* Copy */}
          <button
            onClick={handleCopy}
            title="Copy"
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: copied ? "var(--accent)" : "var(--text-secondary)",
              padding: "2px 6px", borderRadius: 4, fontSize: 11, fontWeight: 500,
              display: "flex", alignItems: "center", gap: 3,
              transition: "color 0.15s",
            }}
          >
            {copied ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Copied
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                Copy
              </>
            )}
          </button>
          {/* Download */}
          <button
            onClick={handleDownload}
            title={`Download as ${filename}`}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--text-secondary)",
              padding: "2px 6px", borderRadius: 4, fontSize: 11, fontWeight: 500,
              display: "flex", alignItems: "center", gap: 3,
              transition: "color 0.15s",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download
          </button>
        </div>
      </div>
      {/* Code content */}
      <pre style={{ margin: 0, padding: 14, overflowX: "auto", fontSize: 13, lineHeight: 1.5 }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

function EmailDraftCard({ draft, messageId }: { draft: EmailDraft; messageId: string }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(draft.sent || false);
  const [error, setError] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");

  const handlePreview = async () => {
    if (showPreview) { setShowPreview(false); return; }
    try {
      const res = await fetch("/api/email/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: draft.subject, bodyHtml: draft.bodyHtml }),
      });
      if (res.ok) {
        setPreviewHtml(await res.text());
        setShowPreview(true);
      }
    } catch {}
  };

  const handleSend = async () => {
    if (!draft.to) { setError("No recipient email address"); return; }
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (data.success) {
        setSent(true);
        // Update the message in the store so the sent state persists
        const store = useChatStore.getState();
        const conv = store.conversations.find(c =>
          c.messages.some(m => m.id === messageId)
        );
        if (conv) {
          store.updateMessage(conv.id, messageId, {
            emailDraft: { ...draft, sent: true },
          });
        }
      } else {
        setError(data.error || "Failed to send");
      }
    } catch {
      setError("Network error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{
      marginTop: 10,
      border: "1.5px solid var(--border)",
      borderRadius: 12,
      overflow: "hidden",
      background: "var(--surface-secondary)",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "12px 16px",
        background: sent ? "rgba(34,197,94,0.06)" : "var(--surface-tertiary)",
        borderBottom: "1px solid var(--border)",
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={sent ? "#22c55e" : "var(--accent)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="M22 7l-10 7L2 7" />
        </svg>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
          {sent ? "Email Sent ✓" : "Email Draft"}
        </span>
        {sent && (
          <span style={{ fontSize: 11, color: "#22c55e", fontWeight: 600, marginLeft: "auto" }}>Delivered</span>
        )}
      </div>

      {/* Details */}
      <div style={{ padding: "12px 16px", fontSize: 13 }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
          <span style={{ color: "var(--text-secondary)", fontWeight: 500, minWidth: 52 }}>To:</span>
          <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{draft.to || "(no recipient)"}{draft.toName ? ` (${draft.toName})` : ""}</span>
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
          <span style={{ color: "var(--text-secondary)", fontWeight: 500, minWidth: 52 }}>Subject:</span>
          <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{draft.subject}</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <span style={{ color: "var(--text-secondary)", fontWeight: 500, minWidth: 52 }}>From:</span>
          <span style={{ color: "var(--text-secondary)" }}>nova@pixel-and-purpose.com</span>
        </div>
      </div>

      {/* Preview iframe */}
      {showPreview && previewHtml && (
        <div style={{ borderTop: "1px solid var(--border)" }}>
          <iframe
            srcDoc={previewHtml}
            title="Email preview"
            style={{ width: "100%", height: 360, border: "none" }}
            sandbox="allow-same-origin"
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ padding: "6px 16px", color: "#ef4444", fontSize: 12 }}>{error}</div>
      )}

      {/* Actions */}
      {!sent && (
        <div style={{
          display: "flex", gap: 8, padding: "10px 16px",
          borderTop: "1px solid var(--border)",
        }}>
          <button
            onClick={handlePreview}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "7px 14px", fontSize: 12, fontWeight: 600,
              borderRadius: 8, border: "1.5px solid var(--border)",
              background: "var(--surface-primary)", color: "var(--text-primary)",
              cursor: "pointer",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            {showPreview ? "Hide Preview" : "Preview"}
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "7px 14px", fontSize: 12, fontWeight: 600,
              borderRadius: 8, border: "none",
              background: "var(--accent)", color: "#fff",
              cursor: sending ? "default" : "pointer",
              opacity: sending ? 0.6 : 1,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
            {sending ? "Sending..." : "Send Email"}
          </button>
        </div>
      )}
    </div>
  );
}

function DocumentCard({ doc }: { doc: GeneratedDoc }) {
  const [showPreview, setShowPreview] = useState(false);
  const typeIcon = doc.type === "docx" ? "📄" : doc.type === "xlsx" ? "📊" : "📑";
  const typeLabel = doc.type.toUpperCase();

  return (
    <div style={{
      marginTop: 10,
      borderRadius: 14,
      border: "1.5px solid var(--border)",
      background: "var(--surface-secondary)",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 24 }}>{typeIcon}</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{doc.title}</div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              {typeLabel} • {new Date(doc.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={() => setShowPreview(!showPreview)}
            style={{
              padding: "6px 12px",
              fontSize: 12,
              fontWeight: 500,
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--surface-primary)",
              color: "var(--text-primary)",
              cursor: "pointer",
            }}
          >
            {showPreview ? "Hide" : "Preview"}
          </button>
          <a
            href={doc.downloadUrl}
            download={`${doc.title}.${doc.type}`}
            style={{
              padding: "6px 12px",
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 8,
              border: "none",
              background: "var(--accent)",
              color: "#fff",
              cursor: "pointer",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            ⬇ Download
          </a>
        </div>
      </div>

      {/* Preview */}
      {showPreview && doc.previewHtml && (
        <div style={{
          borderTop: "1px solid var(--border)",
          background: "#fff",
          maxHeight: 400,
          overflowY: "auto",
        }}>
          <div dangerouslySetInnerHTML={{ __html: doc.previewHtml }} />
        </div>
      )}
    </div>
  );
}

function JiraIssueRow({ issue, color }: { issue: JiraIssue; color: string }) {
  const typeIcon: Record<string, string> = { Epic: "⚡", Story: "📗", Subtask: "📌", Task: "☑️", Bug: "🐛" };
  return (
    <a
      href={issue.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        borderRadius: 10,
        background: "var(--surface-primary)",
        border: `1.5px solid ${color}`,
        textDecoration: "none",
        color: "inherit",
        transition: "transform 0.1s",
      }}
    >
      <span style={{ fontSize: 18 }}>{typeIcon[issue.type] || "🎫"}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{issue.summary}</div>
        <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>
          {issue.type} • {issue.key}
        </div>
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        <polyline points="15 3 21 3 21 9" />
        <line x1="10" y1="14" x2="21" y2="3" />
      </svg>
    </a>
  );
}

function JiraCard({ result }: { result: JiraResult }) {
  const issues = [
    result.epic && { issue: result.epic, color: "#7c3aed" },
    result.story && { issue: result.story, color: "#059669" },
    result.subtask && { issue: result.subtask, color: "#2563eb" },
    result.issue && { issue: result.issue, color: "#d97706" },
  ].filter(Boolean) as { issue: JiraIssue; color: string }[];

  return (
    <div style={{
      marginTop: 10,
      borderRadius: 14,
      border: "1.5px solid var(--border)",
      background: "var(--surface-secondary)",
      overflow: "hidden",
    }}>
      <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid var(--border)" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
          <path d="M11.5 2C6.81 2 3 5.81 3 10.5S6.81 19 11.5 19h.5v3c4.86-2.34 8-7 8-11.5C20 5.81 16.19 2 11.5 2z" />
        </svg>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Jira Issues Created</span>
      </div>
      <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        {issues.map(({ issue, color }) => (
          <JiraIssueRow key={issue.key} issue={issue} color={color} />
        ))}
      </div>
    </div>
  );
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const hasVideos = message.videos && message.videos.length > 0;
  const hasSources = message.sources && message.sources.length > 0;
  const hasImage = !!message.generatedImage;
  const hasEmailDraft = !!message.emailDraft;
  const showSpeaker = !isUser && !message.isStreaming && message.content.length > 0;

  return (
    <div
      className="animate-fade-in-up"
      style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}
    >
      <div style={{ maxWidth: "min(85%, 680px)", display: "flex", gap: 10, alignItems: "flex-start" }}>
        {/* Avatar for AI */}
        {!isUser && (
          <div style={{
            flexShrink: 0,
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "var(--accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 2,
          }}>
            <span style={{ color: "#fff", fontSize: 10, fontWeight: 700 }}>N</span>
          </div>
        )}

        <div style={{ minWidth: 0, flex: 1 }}>
          {/* Bubble */}
          <div className={isUser ? "nova-bubble-user" : "nova-bubble-ai"}>
            {isUser ? (
              <div style={{ fontSize: 15, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {message.content}
              </div>
            ) : (
              <div className="nova-markdown">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    a: ({ href, children }) => (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {children}
                      </a>
                    ),
                    code: ({ className, children, ...props }) => {
                      const match = /language-(\w+)/.exec(className || "");
                      const codeStr = String(children);
                      // Block code (has language class from markdown fences)
                      if (match) {
                        return <CodeBlock lang={match[1]}>{codeStr}</CodeBlock>;
                      }
                      // Inline code
                      return <code className={className} {...props}>{children}</code>;
                    },
                    pre: ({ children }) => <>{children}</>,
                  }}
                >
                  {message.content}
                </ReactMarkdown>
                {message.isStreaming && (
                  <span
                    className="animate-blink"
                    style={{
                      display: "inline-block",
                      width: 2,
                      height: "1em",
                      background: "var(--accent)",
                      marginLeft: 2,
                      verticalAlign: "text-bottom",
                    }}
                  />
                )}
              </div>
            )}
          </div>

          {/* Generated image - outside bubble */}
          {hasImage && (
            <div style={{ marginTop: 10 }}>
              <img
                src={message.generatedImage}
                alt="Generated image"
                style={{
                  width: "100%",
                  maxWidth: 512,
                  borderRadius: 16,
                  border: "1px solid var(--border)",
                }}
              />
            </div>
          )}

          {/* Email draft card - outside bubble */}
          {hasEmailDraft && (
            <EmailDraftCard draft={message.emailDraft!} messageId={message.id} />
          )}

          {/* Generated document card - outside bubble */}
          {message.generatedDoc && (
            <DocumentCard doc={message.generatedDoc} />
          )}

          {/* Jira result card - outside bubble */}
          {message.jiraResult && (
            <JiraCard result={message.jiraResult} />
          )}

          {/* Videos grid - outside bubble */}
          {hasVideos && (
            <div className="nova-video-grid" style={{ marginTop: 10 }}>
              {message.videos!.map((video) => (
                <VideoCard key={video.videoId} video={video} />
              ))}
            </div>
          )}

          {/* Sources - outside bubble */}
          {hasSources && (
            <div style={{ marginTop: 8 }}>
              <SourceCitation sources={message.sources!} />
            </div>
          )}

          {/* Timestamp + speaker */}
          <div style={{
            fontSize: 11,
            color: "var(--text-secondary)",
            marginTop: 4,
            textAlign: isUser ? "right" : "left",
            display: "flex",
            alignItems: "center",
            justifyContent: isUser ? "flex-end" : "flex-start",
            gap: 6,
          }}>
            <span>
              {new Date(message.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {showSpeaker && <SpeakButton text={message.content} />}
          </div>
        </div>
      </div>
    </div>
  );
}
