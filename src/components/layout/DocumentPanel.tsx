"use client";

import { useState, useRef, useCallback } from "react";
import { Modal } from "@/components/ui/Modal";

type DocType = "docx" | "xlsx" | "pdf";
type View = "home" | "create" | "view" | "preview";

interface Section {
  heading: string;
  content: string;
}

interface GeneratedResult {
  type: DocType;
  title: string;
  downloadUrl: string;
  previewHtml: string;
}

interface ViewResult {
  html?: string;
  dataUri?: string;
  type: string;
  name: string;
}

interface DocumentPanelProps {
  open: boolean;
  onClose: () => void;
}

export function DocumentPanel({ open, onClose }: DocumentPanelProps) {
  const [view, setView] = useState<View>("home");
  const [docType, setDocType] = useState<DocType>("docx");
  const [title, setTitle] = useState("");
  const [sections, setSections] = useState<Section[]>([{ heading: "", content: "" }]);
  const [tableData, setTableData] = useState<string[][]>([["", ""], ["", ""]]);
  const [hasTable, setHasTable] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<GeneratedResult | null>(null);
  const [viewResult, setViewResult] = useState<ViewResult | null>(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setView("home");
    setDocType("docx");
    setTitle("");
    setSections([{ heading: "", content: "" }]);
    setTableData([["", ""], ["", ""]]);
    setHasTable(false);
    setGenerated(null);
    setViewResult(null);
    setError("");
  }, []);

  const handleGenerate = async () => {
    if (!title.trim()) { setError("Please enter a document title"); return; }
    setError("");
    setGenerating(true);
    try {
      const res = await fetch("/api/docs/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: docType,
          title: title.trim(),
          sections: sections.filter((s) => s.heading.trim() || s.content.trim()),
          tableData: hasTable ? tableData.filter((r) => r.some((c) => c.trim())) : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setGenerated({
          type: data.doc.type,
          title: data.doc.title,
          downloadUrl: data.doc.downloadUrl,
          previewHtml: data.doc.previewHtml,
        });
        setView("preview");
      } else {
        setError(data.error || "Failed to generate");
      }
    } catch {
      setError("Network error");
    } finally {
      setGenerating(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setError("");
    setGenerating(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/docs/view", { method: "POST", body: formData });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setViewResult(data);
        setView("view");
      }
    } catch {
      setError("Failed to process file");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (generated?.downloadUrl) {
      const a = document.createElement("a");
      a.href = generated.downloadUrl;
      a.download = `${generated.title}.${generated.type}`;
      a.click();
    }
  };

  const addSection = () => setSections([...sections, { heading: "", content: "" }]);
  const updateSection = (i: number, field: "heading" | "content", val: string) => {
    const arr = [...sections];
    arr[i] = { ...arr[i], [field]: val };
    setSections(arr);
  };
  const removeSection = (i: number) => {
    if (sections.length > 1) setSections(sections.filter((_, idx) => idx !== i));
  };

  const addRow = () => setTableData([...tableData, new Array(tableData[0]?.length || 2).fill("")]);
  const addCol = () => setTableData(tableData.map((r) => [...r, ""]));
  const updateCell = (r: number, c: number, val: string) => {
    const arr = tableData.map((row) => [...row]);
    arr[r][c] = val;
    setTableData(arr);
  };

  // Shared styles
  const input: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    fontSize: 14,
    borderRadius: 10,
    border: "1.5px solid var(--border)",
    background: "var(--surface-secondary)",
    color: "var(--text-primary)",
    outline: "none",
    boxSizing: "border-box",
  };
  const textarea: React.CSSProperties = {
    ...input,
    minHeight: 90,
    resize: "vertical",
    fontFamily: "inherit",
    lineHeight: 1.6,
  };
  const btnPrimary: React.CSSProperties = {
    padding: "10px 20px",
    fontSize: 14,
    fontWeight: 600,
    borderRadius: 10,
    border: "none",
    background: "var(--accent)",
    color: "#fff",
    cursor: "pointer",
  };
  const btnSecondary: React.CSSProperties = {
    padding: "10px 20px",
    fontSize: 14,
    fontWeight: 500,
    borderRadius: 10,
    border: "1.5px solid var(--border)",
    background: "var(--surface-secondary)",
    color: "var(--text-primary)",
    cursor: "pointer",
  };
  const cardStyle: React.CSSProperties = {
    padding: 20,
    borderRadius: 14,
    border: "1.5px solid var(--border)",
    background: "var(--surface-secondary)",
    cursor: "pointer",
    transition: "all 0.15s ease",
  };
  const label: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    color: "var(--text-secondary)",
    marginBottom: 6,
    display: "block",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  };

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }} maxWidth={640}>
      <div style={{ padding: "16px 24px 0", fontSize: 17, fontWeight: 600, color: "var(--text-primary)" }}>
        {view === "home" ? "Documents" :
         view === "create" ? "Create Document" :
         view === "view" ? (viewResult?.name || "View Document") :
         "Document Preview"}
      </div>
      <div style={{ padding: "16px 24px 24px", maxHeight: "75vh", overflowY: "auto" }}>

        {/* Error */}
        {error && (
          <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(255,59,48,0.1)", color: "#ff3b30", fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {/* ── HOME ── */}
        {view === "home" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Create New */}
            <div
              style={cardStyle}
              onClick={() => setView("create")}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 28 }}>📝</span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>Create New Document</div>
                  <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>
                    Generate Word, Excel, or PDF documents
                  </div>
                </div>
              </div>
            </div>

            {/* View / Edit */}
            <div
              style={cardStyle}
              onClick={() => fileInputRef.current?.click()}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 28 }}>📂</span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>Open & View Document</div>
                  <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>
                    View .docx, .xlsx, .pdf, .csv, .txt files
                  </div>
                </div>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx,.xlsx,.xls,.pdf,.txt,.csv,.md"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileUpload(f);
                e.target.value = "";
              }}
            />

            {/* Tip */}
            <div style={{ fontSize: 12, color: "var(--text-secondary)", padding: "8px 0", textAlign: "center", opacity: 0.7 }}>
              💡 You can also say &quot;create a report about...&quot; in chat
            </div>
          </div>
        )}

        {/* ── CREATE ── */}
        {view === "create" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Format selector */}
            <div>
              <span style={label}>Format</span>
              <div style={{ display: "flex", gap: 8 }}>
                {(["docx", "xlsx", "pdf"] as DocType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setDocType(t)}
                    style={{
                      flex: 1,
                      padding: "10px 0",
                      fontSize: 13,
                      fontWeight: 600,
                      borderRadius: 10,
                      border: `1.5px solid ${docType === t ? "var(--accent)" : "var(--border)"}`,
                      background: docType === t ? "var(--accent)" : "var(--surface-secondary)",
                      color: docType === t ? "#fff" : "var(--text-primary)",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {t === "docx" ? "📄 Word" : t === "xlsx" ? "📊 Excel" : "📑 PDF"}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <span style={label}>Document Title</span>
              <input
                style={input}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Q1 Sales Report"
              />
            </div>

            {/* Sections */}
            <div>
              <span style={label}>Sections</span>
              {sections.map((s, i) => (
                <div key={i} style={{ marginBottom: 12, padding: 14, borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface-primary)" }}>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <input
                      style={{ ...input, flex: 1 }}
                      value={s.heading}
                      onChange={(e) => updateSection(i, "heading", e.target.value)}
                      placeholder={`Section ${i + 1} Heading`}
                    />
                    {sections.length > 1 && (
                      <button
                        onClick={() => removeSection(i)}
                        style={{ padding: "6px 10px", borderRadius: 8, border: "none", background: "rgba(255,59,48,0.1)", color: "#ff3b30", cursor: "pointer", fontSize: 14 }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <textarea
                    style={textarea}
                    value={s.content}
                    onChange={(e) => updateSection(i, "content", e.target.value)}
                    placeholder="Section content... Use bullet points with - or •"
                  />
                </div>
              ))}
              <button onClick={addSection} style={{ ...btnSecondary, fontSize: 13, padding: "8px 16px" }}>
                + Add Section
              </button>
            </div>

            {/* Table toggle */}
            <div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14, color: "var(--text-primary)" }}>
                <input
                  type="checkbox"
                  checked={hasTable}
                  onChange={(e) => setHasTable(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: "var(--accent)" }}
                />
                Include a data table
              </label>
            </div>

            {/* Table editor */}
            {hasTable && (
              <div style={{ overflowX: "auto" }}>
                <span style={label}>Table Data (first row = headers)</span>
                <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
                  <tbody>
                    {tableData.map((row, r) => (
                      <tr key={r}>
                        {row.map((cell, c) => (
                          <td key={c} style={{ padding: 2 }}>
                            <input
                              style={{
                                ...input,
                                padding: "7px 10px",
                                fontSize: 13,
                                borderRadius: 6,
                                fontWeight: r === 0 ? 600 : 400,
                              }}
                              value={cell}
                              onChange={(e) => updateCell(r, c, e.target.value)}
                              placeholder={r === 0 ? `Header ${c + 1}` : ""}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button onClick={addRow} style={{ ...btnSecondary, fontSize: 12, padding: "6px 12px" }}>+ Row</button>
                  <button onClick={addCol} style={{ ...btnSecondary, fontSize: 12, padding: "6px 12px" }}>+ Column</button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 8 }}>
              <button onClick={() => setView("home")} style={btnSecondary}>Back</button>
              <button onClick={handleGenerate} disabled={generating} style={{ ...btnPrimary, opacity: generating ? 0.6 : 1 }}>
                {generating ? "Generating..." : `Generate ${docType.toUpperCase()}`}
              </button>
            </div>
          </div>
        )}

        {/* ── VIEW (uploaded file) ── */}
        {view === "view" && viewResult && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {viewResult.dataUri ? (
              <iframe
                src={viewResult.dataUri}
                style={{ width: "100%", height: "60vh", border: "1px solid var(--border)", borderRadius: 12 }}
                title="PDF viewer"
              />
            ) : viewResult.html ? (
              <div
                style={{
                  background: "#fff",
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  maxHeight: "60vh",
                  overflowY: "auto",
                }}
                dangerouslySetInnerHTML={{ __html: viewResult.html }}
              />
            ) : null}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={reset} style={btnSecondary}>Back</button>
            </div>
          </div>
        )}

        {/* ── PREVIEW (generated doc) ── */}
        {view === "preview" && generated && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div
              style={{
                background: "#fff",
                borderRadius: 12,
                border: "1px solid var(--border)",
                maxHeight: "55vh",
                overflowY: "auto",
              }}
              dangerouslySetInnerHTML={{ __html: generated.previewHtml }}
            />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={reset} style={btnSecondary}>Create Another</button>
              <button onClick={handleDownload} style={btnPrimary}>
                ⬇ Download {generated.type.toUpperCase()}
              </button>
            </div>
          </div>
        )}

        {/* Loading state */}
        {generating && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40, gap: 10 }}>
            <div style={{ width: 20, height: 20, border: "2px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
            <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>Processing...</span>
          </div>
        )}
      </div>
    </Modal>
  );
}
