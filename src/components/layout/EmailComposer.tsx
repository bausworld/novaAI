"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";

interface EmailComposerProps {
  open: boolean;
  onClose: () => void;
}

type View = "compose" | "preview";

export function EmailComposer({ open, onClose }: EmailComposerProps) {
  const [to, setTo] = useState("");
  const [toName, setToName] = useState("");
  const [subject, setSubject] = useState("");
  const [view, setView] = useState<View>("compose");
  const [previewHtml, setPreviewHtml] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const editorRef = useRef<HTMLDivElement>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setView("compose");
      setSent(false);
      setError("");
    }
  }, [open]);

  const bodyHtmlRef = useRef("");

  const getEditorContent = useCallback(() => {
    if (editorRef.current) {
      bodyHtmlRef.current = editorRef.current.innerHTML;
    }
    return bodyHtmlRef.current;
  }, []);

  const handlePreview = async () => {
    const html = getEditorContent();
    try {
      const res = await fetch("/api/email/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, bodyHtml: html }),
      });
      if (res.ok) {
        const previewContent = await res.text();
        setPreviewHtml(previewContent);
        setView("preview");
      }
    } catch {
      setError("Failed to load preview");
    }
  };

  const handleSend = async () => {
    setError("");
    if (!to || !subject) {
      setError("Recipient email and subject are required");
      return;
    }

    const html = view === "compose" ? getEditorContent() : bodyHtmlRef.current;
    setSending(true);

    try {
      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, toName, subject, bodyHtml: html }),
      });
      const data = await res.json();
      if (data.success) {
        setSent(true);
      } else {
        setError(data.error || "Failed to send email");
      }
    } catch {
      setError("Network error — could not send email");
    } finally {
      setSending(false);
    }
  };

  const handleReset = () => {
    setTo("");
    setToName("");
    setSubject("");
    bodyHtmlRef.current = "";
    setSent(false);
    setError("");
    setView("compose");
    if (editorRef.current) editorRef.current.innerHTML = "";
  };

  const handleFormatting = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
  };

  if (sent) {
    return (
      <Modal open={open} onClose={onClose} maxWidth={700}>
        <div style={{ width: "min(520px, 92vw)", padding: 40, textAlign: "center" }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%", background: "rgba(34,197,94,0.1)",
            display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 6px" }}>Email Sent!</h2>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", margin: "0 0 24px" }}>
            Your email to <strong>{to}</strong> has been sent successfully.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button onClick={handleReset} style={btnSecondary}>Compose Another</button>
            <button onClick={onClose} style={btnPrimary}>Done</button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onClose} maxWidth={700}>
      <div style={{ width: "min(680px, 95vw)", maxHeight: "88vh", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 24px", borderBottom: "1px solid var(--border)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%", background: "var(--accent)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M22 7l-10 7L2 7" />
              </svg>
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Compose Email</h2>
              <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0 }}>from nova@pixel-and-purpose.com</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {/* View toggle */}
            <button
              onClick={() => view === "compose" ? handlePreview() : setView("compose")}
              style={{
                ...btnTab,
                background: view === "preview" ? "var(--accent-light)" : "var(--surface-secondary)",
                color: view === "preview" ? "var(--accent)" : "var(--text-secondary)",
              }}
            >
              {view === "compose" ? (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  Preview
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Edit
                </>
              )}
            </button>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: 4 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {view === "compose" ? (
          <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
            {/* To / Subject fields */}
            <div style={{ padding: "0 24px" }}>
              <div style={{ display: "flex", gap: 10, paddingTop: 16 }}>
                <div style={{ flex: 2 }}>
                  <label style={labelStyle}>To</label>
                  <input
                    type="email"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    placeholder="recipient@email.com"
                    style={inputStyle}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Name (optional)</label>
                  <input
                    type="text"
                    value={toName}
                    onChange={(e) => setToName(e.target.value)}
                    placeholder="John Doe"
                    style={inputStyle}
                  />
                </div>
              </div>
              <div style={{ paddingTop: 10 }}>
                <label style={labelStyle}>Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Email subject"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Formatting toolbar */}
            <div style={{
              display: "flex", gap: 2, padding: "12px 24px 8px",
              borderBottom: "1px solid var(--border)",
              flexWrap: "wrap",
            }}>
              <button onClick={() => handleFormatting("bold")} style={toolBtn} title="Bold"><strong>B</strong></button>
              <button onClick={() => handleFormatting("italic")} style={toolBtn} title="Italic"><em>I</em></button>
              <button onClick={() => handleFormatting("underline")} style={toolBtn} title="Underline"><u>U</u></button>
              <div style={{ width: 1, background: "var(--border)", margin: "0 4px" }} />
              <button onClick={() => handleFormatting("formatBlock", "h2")} style={toolBtn} title="Heading">H2</button>
              <button onClick={() => handleFormatting("formatBlock", "h3")} style={toolBtn} title="Subheading">H3</button>
              <button onClick={() => handleFormatting("formatBlock", "p")} style={toolBtn} title="Paragraph">P</button>
              <div style={{ width: 1, background: "var(--border)", margin: "0 4px" }} />
              <button onClick={() => handleFormatting("insertUnorderedList")} style={toolBtn} title="Bullet list">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
              </button>
              <button onClick={() => handleFormatting("insertOrderedList")} style={toolBtn} title="Numbered list">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="10" y1="6" x2="21" y2="6" /><line x1="10" y1="12" x2="21" y2="12" /><line x1="10" y1="18" x2="21" y2="18" /><path d="M4 6h1v4" /><path d="M4 10h2" /><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" /></svg>
              </button>
              <button onClick={() => handleFormatting("formatBlock", "blockquote")} style={toolBtn} title="Quote">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z" /><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3z" /></svg>
              </button>
              <div style={{ width: 1, background: "var(--border)", margin: "0 4px" }} />
              <button
                onClick={() => {
                  const url = prompt("Enter link URL:");
                  if (url) handleFormatting("createLink", url);
                }}
                style={toolBtn}
                title="Insert link"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
              </button>
            </div>

            {/* Rich text editor */}
            <div style={{ flex: 1, padding: "0 24px 16px", minHeight: 200 }}>
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                style={{
                  minHeight: 200,
                  maxHeight: 360,
                  overflowY: "auto",
                  padding: 16,
                  fontSize: 14,
                  lineHeight: 1.7,
                  color: "var(--text-primary)",
                  background: "var(--surface-secondary)",
                  borderRadius: 10,
                  border: "1.5px solid var(--border)",
                  outline: "none",
                  marginTop: 12,
                }}
              />
            </div>

            {/* Error */}
            {error && (
              <div style={{ padding: "0 24px 12px", color: "#ef4444", fontSize: 13 }}>{error}</div>
            )}

            {/* Actions */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "12px 24px 20px", borderTop: "1px solid var(--border)",
            }}>
              <button onClick={handlePreview} style={btnSecondary}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                Preview
              </button>
              <button onClick={handleSend} disabled={sending} style={{ ...btnPrimary, opacity: sending ? 0.6 : 1 }}>
                {sending ? "Sending..." : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                    Send Email
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Preview view */
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ flex: 1, overflow: "auto" }}>
              <iframe
                srcDoc={previewHtml}
                title="Email preview"
                style={{
                  width: "100%",
                  height: "100%",
                  minHeight: 480,
                  border: "none",
                  borderRadius: "0 0 16px 16px",
                }}
                sandbox="allow-same-origin"
              />
            </div>

            {/* Error */}
            {error && (
              <div style={{ padding: "8px 24px 0", color: "#ef4444", fontSize: 13 }}>{error}</div>
            )}

            {/* Preview actions */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "12px 24px 20px", borderTop: "1px solid var(--border)",
            }}>
              <button onClick={() => setView("compose")} style={btnSecondary}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Back to Edit
              </button>
              <button onClick={handleSend} disabled={sending} style={{ ...btnPrimary, opacity: sending ? 0.6 : 1 }}>
                {sending ? "Sending..." : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                    Send Email
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// Shared styles
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  fontSize: 14,
  borderRadius: 8,
  border: "1.5px solid var(--border)",
  background: "var(--surface-secondary)",
  color: "var(--text-primary)",
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  color: "var(--text-secondary)",
  marginBottom: 4,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const btnPrimary: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "10px 20px",
  fontSize: 13,
  fontWeight: 600,
  borderRadius: 8,
  border: "none",
  background: "var(--accent)",
  color: "#fff",
  cursor: "pointer",
};

const btnSecondary: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "10px 16px",
  fontSize: 13,
  fontWeight: 500,
  borderRadius: 8,
  border: "1.5px solid var(--border)",
  background: "var(--surface-secondary)",
  color: "var(--text-primary)",
  cursor: "pointer",
};

const toolBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 30,
  height: 28,
  fontSize: 13,
  fontWeight: 600,
  borderRadius: 6,
  border: "none",
  background: "var(--surface-secondary)",
  color: "var(--text-primary)",
  cursor: "pointer",
};

const btnTab: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  padding: "6px 12px",
  fontSize: 12,
  fontWeight: 600,
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
};
