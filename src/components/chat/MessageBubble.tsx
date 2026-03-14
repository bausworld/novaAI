"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Message, EmailDraft, GeneratedDoc, JiraResult, JiraIssue, GeneratedVideo, SavedRecipe, BufferResult } from "@/lib/types";
// Pills for recipe selection
function RecipeOptionPills({ options, messageId, conversationId }: { options: any[]; messageId: string; conversationId: string }) {
  const updateMessage = useChatStore(s => s.updateMessage);
  const [submitting, setSubmitting] = React.useState<number | null>(null);

  const handlePick = async (index: number) => {
    setSubmitting(index);
    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: options[index].title, selected: 0 }),
      });
      const data = await res.json();
      if (res.ok && data.recipe) {
        updateMessage(conversationId, messageId, {
          content: `**${data.recipe.title}** has been added to the database!${data.imageGenerated ? " A custom hero image was generated." : ""}\n\nView it at [1yearchef.com/recipes/${data.recipe.slug}](https://www.1yearchef.com/recipes/${data.recipe.slug})`,
          savedRecipe: {
            slug: data.recipe.slug,
            title: data.recipe.title,
            tagline: data.recipe.tagline || "",
            servings: data.recipe.servings || "",
            prep_time: data.recipe.prep_time,
            cook_time: data.recipe.cook_time,
            total_time: data.recipe.total_time,
            image_url: data.recipe.image_url || "",
            ingredients: data.recipe.ingredients || [],
            instructions: data.recipe.instructions || [],
            tags: data.recipe.tags || [],
            nutrition: data.recipe.nutrition || {},
            status: "ready",
          },
          recipeOptions: undefined,
        });
      } else {
        updateMessage(conversationId, messageId, {
          content: `Sorry, recipe import failed. ${data.error || "Unknown error"}`,
          recipeOptions: undefined,
        });
      }
    } catch (err) {
      updateMessage(conversationId, messageId, {
        content: `Sorry, recipe import failed. ${err instanceof Error ? err.message : ""}`,
        recipeOptions: undefined,
      });
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, margin: "16px 0" }}>
      {options.map((opt, i) => (
        <button
          key={i}
          onClick={() => handlePick(i)}
          disabled={submitting !== null}
          title={opt.title}
          style={{
            padding: "10px 18px",
            borderRadius: 12,
            border: submitting === i ? "2px solid var(--accent)" : "1.5px solid var(--border)",
            background: submitting === i ? "var(--accent)" : "var(--surface-tertiary)",
            color: submitting === i ? "#fff" : "var(--text-primary)",
            fontWeight: 600,
            fontSize: 14,
            cursor: submitting !== null ? "not-allowed" : "pointer",
            boxShadow: submitting === i ? "0 2px 8px rgba(34,197,94,0.12)" : undefined,
            transition: "all 0.18s",
            minWidth: 0,
            maxWidth: 320,
            textAlign: "left",
            whiteSpace: "normal",
            lineHeight: 1.35,
          }}
        >
          {opt.title}
        </button>
      ))}
    </div>
  );
}
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

function RecipeCard({ recipe }: { recipe: SavedRecipe }) {
  const [showNutrition, setShowNutrition] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const isReady = recipe.status === "ready";
  const isError = recipe.status === "error";
  const isLoading = recipe.status === "searching" || recipe.status === "generating-image" || recipe.status === "saving";

  const statusLabel =
    recipe.status === "searching" ? "Searching for recipe..." :
    recipe.status === "generating-image" ? "Generating hero image..." :
    recipe.status === "saving" ? "Saving to database..." :
    recipe.status === "error" ? "Error" : "";

  return (
    <div style={{
      marginTop: 10,
      borderRadius: 14,
      border: "1.5px solid var(--border)",
      background: "var(--surface-secondary)",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "12px 16px",
        background: isReady ? "rgba(34,197,94,0.06)" : isError ? "rgba(239,68,68,0.06)" : "var(--surface-tertiary)",
        borderBottom: "1px solid var(--border)",
      }}>
        <span style={{ fontSize: 16 }}>🍽️</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", flex: 1 }}>
          {isReady ? recipe.title : isError ? "Recipe Error" : "Adding Recipe..."}
        </span>
        {isLoading && (
          <span style={{ fontSize: 11, color: "var(--accent)", fontWeight: 500 }}>{statusLabel}</span>
        )}
        {isReady && (
          <span style={{ fontSize: 11, color: "#22c55e", fontWeight: 600 }}>Saved ✓</span>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div style={{ padding: "20px 16px", textAlign: "center" }}>
          <div className="animate-progress-bar" style={{
            height: 4, borderRadius: 2, background: "var(--surface-tertiary)",
            overflow: "hidden", marginBottom: 8,
          }}>
            <div style={{
              height: "100%", width: "60%", borderRadius: 2,
              background: "var(--accent)",
              animation: "progressSlide 2s ease-in-out infinite",
            }} />
          </div>
          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{statusLabel}</span>
        </div>
      )}

      {/* Error state */}
      {isError && recipe.error && (
        <div style={{ padding: "12px 16px", color: "#ef4444", fontSize: 13 }}>{recipe.error}</div>
      )}

      {/* Recipe content */}
      {isReady && (
        <>
          {/* Hero media: video plays once on desktop, then crossfades to image */}
          <div style={{ display: "flex", gap: 0 }}>
            {recipe.image_url && (
              <div style={{ width: 140, minHeight: 140, flexShrink: 0, position: "relative", overflow: "hidden" }}>
                <img
                  src={recipe.image_url}
                  alt={recipe.title}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            )}
            <div style={{ flex: 1, padding: "12px 16px" }}>
              <div style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 500, marginBottom: 4 }}>
                {recipe.tagline}
              </div>
              <div style={{ display: "flex", gap: 12, fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>
                {recipe.total_time && <span>⏱ {recipe.total_time}</span>}
                {recipe.servings && <span>👥 {recipe.servings} servings</span>}
              </div>
              {/* Tags */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {(recipe.tags ?? []).slice(0, 6).map((tag) => (
                  <span key={tag} style={{
                    fontSize: 10, fontWeight: 600,
                    padding: "2px 8px", borderRadius: 10,
                    background: "var(--accent-alpha-10, rgba(99,102,241,0.1))",
                    color: "var(--accent)",
                  }}>{tag}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Ingredients */}
          <div style={{ borderTop: "1px solid var(--border)", padding: "12px 16px" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
              Ingredients ({(recipe.ingredients ?? []).length})
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px 12px" }}>
              {(recipe.ingredients ?? []).map((ing, i) => (
                <div key={i} style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  • {ing}
                </div>
              ))}
            </div>
          </div>

          {/* Instructions toggle */}
          <div style={{ borderTop: "1px solid var(--border)" }}>
            <button
              onClick={() => setShowInstructions(!showInstructions)}
              style={{
                width: "100%", padding: "10px 16px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                background: "none", border: "none", cursor: "pointer",
                fontSize: 12, fontWeight: 700, color: "var(--text-primary)",
              }}
            >
              <span>Instructions ({(recipe.instructions ?? []).length} steps)</span>
              <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>
                {showInstructions ? "▲ Hide" : "▼ Show"}
              </span>
            </button>
            {showInstructions && (
              <div style={{ padding: "0 16px 12px 16px" }}>
                {(recipe.instructions ?? []).map((step, i) => (
                  <div key={i} style={{
                    display: "flex", gap: 8, marginBottom: 6,
                    fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5,
                  }}>
                    <span style={{
                      flexShrink: 0, width: 20, height: 20, borderRadius: "50%",
                      background: "var(--accent)", color: "#fff",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, fontWeight: 700, marginTop: 1,
                    }}>{i + 1}</span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Nutrition toggle */}
          <div style={{ borderTop: "1px solid var(--border)" }}>
            <button
              onClick={() => setShowNutrition(!showNutrition)}
              style={{
                width: "100%", padding: "10px 16px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                background: "none", border: "none", cursor: "pointer",
                fontSize: 12, fontWeight: 700, color: "var(--text-primary)",
              }}
            >
              <span>Nutrition Facts (per serving)</span>
              <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>
                {showNutrition ? "▲ Hide" : "▼ Show"}
              </span>
            </button>
            {showNutrition && (
              <div style={{ padding: "0 16px 12px 16px" }}>
                <div style={{
                  display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 6,
                }}>
                  {Object.entries(recipe.nutrition ?? {}).map(([key, value]) => {
                    const label = key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
                    return (
                      <div key={key} style={{
                        padding: "6px 8px", borderRadius: 8,
                        background: "var(--surface-tertiary)",
                        fontSize: 11,
                      }}>
                        <div style={{ color: "var(--text-secondary)", fontSize: 10 }}>{label}</div>
                        <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{value}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Link */}
          <div style={{
            borderTop: "1px solid var(--border)",
            padding: "10px 16px",
            display: "flex", justifyContent: "flex-end",
          }}>
            <a
              href={`https://www.1yearchef.com/recipes/${recipe.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 12, fontWeight: 600,
                color: "var(--accent)", textDecoration: "none",
                display: "flex", alignItems: "center", gap: 4,
              }}
            >
              View on 1YearChef →
            </a>
          </div>
        </>
      )}
    </div>
  );
}

function VeoVideoCard({ video }: { video: GeneratedVideo }) {
  const isGenerating = video.status === "generating" || video.status === "polling" || video.status === "downloading";
  const isReady = video.status === "ready" && video.videoUrl;
  const isError = video.status === "error";
  const elapsed = Math.round((Date.now() - video.startedAt) / 1000);

  const statusLabel: Record<string, string> = {
    generating: "Starting generation...",
    polling: "Generating video...",
    downloading: "Downloading video...",
    ready: "Video ready",
    error: "Generation failed",
  };

  const handleDownload = () => {
    if (!video.videoUrl) return;
    const a = document.createElement("a");
    a.href = video.videoUrl;
    a.download = `nova-veo-${Date.now()}.mp4`;
    a.click();
  };

  return (
    <div style={{
      marginTop: 10,
      borderRadius: 14,
      border: `1.5px solid ${isError ? "#ef4444" : isReady ? "#22c55e" : "var(--border)"}`,
      background: "var(--surface-secondary)",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "12px 16px",
        borderBottom: "1px solid var(--border)",
        background: isError ? "rgba(239,68,68,0.06)" : isReady ? "rgba(34,197,94,0.06)" : "var(--surface-tertiary)",
      }}>
        <span style={{ fontSize: 18 }}>🎬</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", flex: 1 }}>
          {statusLabel[video.status]}
        </span>
        {isGenerating && (
          <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{elapsed}s</span>
        )}
      </div>

      {/* Settings row */}
      <div style={{ padding: "10px 16px", display: "flex", gap: 8, flexWrap: "wrap" }}>
        {[
          { label: "Resolution", value: video.resolution },
          { label: "Ratio", value: video.aspectRatio },
          { label: "Duration", value: `${video.durationSeconds}s` },
          { label: "Model", value: video.model.replace("-generate-preview", "").replace("-fast", " Fast") },
        ].map(tag => (
          <span key={tag.label} style={{
            fontSize: 11, fontWeight: 500,
            padding: "3px 8px", borderRadius: 6,
            background: "var(--surface-primary)", border: "1px solid var(--border)",
            color: "var(--text-secondary)",
          }}>
            {tag.label}: <strong style={{ color: "var(--text-primary)" }}>{tag.value}</strong>
          </span>
        ))}
      </div>

      {/* Generating animation */}
      {isGenerating && (
        <div style={{ padding: "20px 16px", textAlign: "center" }}>
          <div style={{
            width: "100%", height: 4, borderRadius: 2,
            background: "var(--surface-tertiary)", overflow: "hidden",
          }}>
            <div className="animate-progress-bar" style={{
              width: "40%", height: "100%", borderRadius: 2,
              background: "var(--accent)",
            }} />
          </div>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 10 }}>
            {video.status === "downloading" ? "Downloading your video..." : "VEO is generating your video — this usually takes 30s to 6 minutes"}
          </p>
        </div>
      )}

      {/* Error display */}
      {isError && (
        <div style={{ padding: "14px 16px", color: "#ef4444", fontSize: 13 }}>
          {video.error || "An unknown error occurred"}
        </div>
      )}

      {/* Video player */}
      {isReady && video.videoUrl && (
        <div style={{ padding: "0 16px 12px" }}>
          <video
            src={video.videoUrl}
            controls
            autoPlay
            loop
            playsInline
            style={{
              width: "100%",
              borderRadius: 10,
              border: "1px solid var(--border)",
              maxHeight: 400,
              background: "#000",
            }}
          />
        </div>
      )}

      {/* Download button */}
      {isReady && (
        <div style={{
          display: "flex", gap: 8, padding: "10px 16px",
          borderTop: "1px solid var(--border)",
        }}>
          <button
            onClick={handleDownload}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 16px", fontSize: 12, fontWeight: 600,
              borderRadius: 8, border: "none",
              background: "var(--accent)", color: "#fff",
              cursor: "pointer",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download MP4
          </button>
        </div>
      )}
    </div>
  );
}

function BufferCard({ result }: { result: BufferResult }) {
  const isSuccess = result.status === "success";
  const isDraft = result.action === "createIdea";
  const actionLabel: Record<string, string> = {
    createTextPost: "Text Post",
    createImagePost: "Image Post",
    createVideoPost: "Video Post",
    createIdea: "Draft / Idea",
  };
  return (
    <div style={{
      marginTop: 10,
      borderRadius: 14,
      border: `1.5px solid ${isSuccess ? "#22c55e" : "#ef4444"}`,
      background: "var(--surface-secondary)",
      overflow: "hidden",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "12px 16px",
        background: isSuccess ? "rgba(34,197,94,0.06)" : "rgba(239,68,68,0.06)",
        borderBottom: "1px solid var(--border)",
      }}>
        {/* Buffer logo mark */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="5" width="18" height="3" rx="1.5" fill={isSuccess ? "#22c55e" : "#ef4444"} />
          <rect x="3" y="10.5" width="18" height="3" rx="1.5" fill={isSuccess ? "#22c55e" : "#ef4444"} />
          <rect x="3" y="16" width="18" height="3" rx="1.5" fill={isSuccess ? "#22c55e" : "#ef4444"} />
        </svg>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
          Buffer {actionLabel[result.action] || result.action}
        </span>
        <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 600, color: isSuccess ? "#22c55e" : "#ef4444" }}>
          {isSuccess ? (isDraft ? "Saved ✓" : "Scheduled ✓") : "Failed"}
        </span>
      </div>
      <div style={{ padding: "12px 16px", fontSize: 13 }}>
        {result.post && (
          <div style={{ marginBottom: 8, color: "var(--text-primary)", lineHeight: 1.5 }}>
            <span style={{ fontWeight: 600, color: "var(--text-secondary)", marginRight: 6 }}>Post:</span>
            {result.post.text}
          </div>
        )}
        {result.idea && (
          <div style={{ marginBottom: 8, color: "var(--text-primary)", lineHeight: 1.5 }}>
            <span style={{ fontWeight: 600, color: "var(--text-secondary)", marginRight: 6 }}>Idea:</span>
            {result.idea.content?.title || result.idea.content?.text || ""}
          </div>
        )}
        {result.error && (
          <div style={{ color: "#ef4444", fontSize: 12 }}>{result.error}</div>
        )}
        {isSuccess && isDraft && (
          <a
            href="https://publish.buffer.com/ideas"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              marginTop: 8,
              padding: "6px 14px",
              borderRadius: 8,
              background: "rgba(34,197,94,0.12)",
              border: "1px solid rgba(34,197,94,0.3)",
              color: "#22c55e",
              fontSize: 12,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            Open in Buffer Ideas
          </a>
        )}
      </div>
    </div>
  );
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const conversationId = useChatStore(s => s.activeConversationId);
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
          }}>
            {/* Avatar icon or image here if needed */}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Pills for recipe selection */}
          {message.recipeOptions && Array.isArray(message.recipeOptions) && message.recipeOptions.length > 0 && conversationId && (
            <RecipeOptionPills options={message.recipeOptions} messageId={message.id} conversationId={conversationId} />
          )}
          {/* Message content */}
          {message.content && (
            <ReactMarkdown
              children={message.content}
              remarkPlugins={[remarkGfm]}
              components={{
                code: ({ node, className, children, ...props }) => {
                  const isBlock = !!className || String(children).includes("\n");
                  return isBlock ? (
                    <CodeBlock lang={className?.replace(/^language-/, "")}>{String(children)}</CodeBlock>
                  ) : (
                    <code {...props} style={{ background: "var(--surface-tertiary)", borderRadius: 4, padding: "1px 5px", fontSize: 13 }}>{children}</code>
                  );
                },
              }}
            />
          )}
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
          {/* VEO generated video card - outside bubble */}
          {message.generatedVideo && (
            <VeoVideoCard video={message.generatedVideo} />
          )}
          {/* Saved recipe card - outside bubble */}
          {message.savedRecipe && (
            <RecipeCard recipe={message.savedRecipe} />
          )}
          {/* Buffer result card - outside bubble */}
          {message.bufferResult && (
            <BufferCard result={message.bufferResult} />
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
